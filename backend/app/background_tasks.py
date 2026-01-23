"""
Background task manager for asynchronous ingestion pipeline.

This module provides a simple in-memory task manager for tracking background
ingestion tasks. Tasks are automatically started after query completion to
reduce user wait time when clicking the mapping button.

Key Features:
- Automatic task cleanup (removes tasks older than 24 hours)
- Status tracking: pending, running, completed, failed
- Non-blocking task execution
- Graceful error handling

Limitations:
- State is not persisted (lost on server restart)
- Not suitable for multi-instance deployments
- For production with multiple instances, consider upgrading to Redis-based solution

Usage:
    from app.background_tasks import background_ingest_manager
    
    # Start a background task
    async def my_ingest():
        return await pipeline.ingest_run(...)
    
    task = background_ingest_manager.start_ingest_task(run_id, my_ingest())
    
    # Check status later
    status = background_ingest_manager.get_task_status(run_id)
    
    # Wait for completion
    result = await background_ingest_manager.wait_for_task(run_id)
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Coroutine, Dict, Optional

logger = logging.getLogger(__name__)


@dataclass
class IngestTask:
    """Represents a background ingestion task."""
    
    run_id: str
    status: str  # "pending", "running", "completed", "failed"
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    project_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary."""
        return {
            "run_id": self.run_id,
            "status": self.status,
            "result": self.result,
            "error": self.error,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "project_id": self.project_id,
        }


class BackgroundIngestManager:
    """
    Manager for background ingestion tasks.
    
    This class maintains an in-memory registry of background tasks and their status.
    Tasks are automatically started and tracked, allowing the frontend to check
    completion status without blocking.
    """
    
    def __init__(self):
        self._tasks: Dict[str, IngestTask] = {}
        self._task_handles: Dict[str, asyncio.Task] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
        logger.info("🔧 BackgroundIngestManager initialized")
    
    def start_ingest_task(
        self,
        run_id: str,
        project_id: str,
        ingest_coroutine: Coroutine
    ) -> IngestTask:
        """
        Start a background ingest task.
        
        Args:
            run_id: The run ID
            project_id: The project ID
            ingest_coroutine: The coroutine to execute (should return IngestStats)
        
        Returns:
            IngestTask object with initial status
        """
        # Check if task already exists
        if run_id in self._tasks:
            existing = self._tasks[run_id]
            if existing.status in ("pending", "running"):
                logger.info(f"⚠️  Background ingest task for run {run_id} already exists (status: {existing.status})")
                return existing
            elif existing.status == "completed":
                logger.info(f"✅ Background ingest task for run {run_id} already completed")
                return existing
            else:
                # Failed task, allow retry
                logger.info(f"🔄 Restarting failed background ingest task for run {run_id}")
        
        # Create new task
        task = IngestTask(
            run_id=run_id,
            project_id=project_id,
            status="pending",
            started_at=datetime.utcnow()
        )
        self._tasks[run_id] = task
        
        # Create background asyncio task
        handle = asyncio.create_task(
            self._run_ingest(run_id, ingest_coroutine),
            name=f"ingest-{run_id}"
        )
        self._task_handles[run_id] = handle
        
        logger.info(f"🚀 Started background ingest task for run {run_id}")
        return task
    
    async def _run_ingest(self, run_id: str, ingest_coroutine: Coroutine):
        """
        Execute the ingestion coroutine in background.
        
        This method updates the task status based on execution results.
        Errors are caught and logged without raising.
        """
        try:
            # Update status to running
            if run_id in self._tasks:
                self._tasks[run_id].status = "running"
                logger.info(f"⚙️  Background ingest running for run {run_id}")
            
            # Execute the ingest coroutine
            result = await ingest_coroutine
            
            # Update status to completed
            if run_id in self._tasks:
                self._tasks[run_id].status = "completed"
                self._tasks[run_id].result = result.model_dump() if hasattr(result, 'model_dump') else result
                self._tasks[run_id].completed_at = datetime.utcnow()
                
                duration = (self._tasks[run_id].completed_at - self._tasks[run_id].started_at).total_seconds()
                logger.info(f"✅ Background ingest completed for run {run_id} in {duration:.2f}s")
        
        except Exception as e:
            # Update status to failed
            if run_id in self._tasks:
                self._tasks[run_id].status = "failed"
                self._tasks[run_id].error = str(e)
                self._tasks[run_id].completed_at = datetime.utcnow()
            
            logger.error(f"❌ Background ingest failed for run {run_id}: {e}", exc_info=True)
        
        finally:
            # Cleanup task handle
            self._task_handles.pop(run_id, None)
    
    def get_task_status(self, run_id: str) -> Optional[IngestTask]:
        """
        Get the status of a background task.
        
        Args:
            run_id: The run ID
        
        Returns:
            IngestTask object if exists, None otherwise
        """
        return self._tasks.get(run_id)
    
    async def wait_for_task(
        self,
        run_id: str,
        timeout: Optional[float] = None
    ) -> Optional[IngestTask]:
        """
        Wait for a background task to complete.
        
        This method blocks until the task completes or timeout is reached.
        If the task doesn't exist, returns None immediately.
        
        Args:
            run_id: The run ID
            timeout: Maximum time to wait in seconds (None = wait forever)
        
        Returns:
            IngestTask object with final status, or None if task doesn't exist
        """
        if run_id not in self._task_handles:
            # Task not running, return current status if exists
            return self._tasks.get(run_id)
        
        try:
            # Wait for the background task to complete
            if timeout:
                await asyncio.wait_for(
                    self._task_handles[run_id],
                    timeout=timeout
                )
            else:
                await self._task_handles[run_id]
        except asyncio.TimeoutError:
            logger.warning(f"⏱️  Timeout waiting for background ingest task {run_id}")
        except Exception as e:
            logger.error(f"❌ Error waiting for background ingest task {run_id}: {e}")
        
        return self._tasks.get(run_id)
    
    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """
        Remove completed/failed tasks older than max_age_hours.
        
        This prevents unbounded memory growth. Running tasks are never removed.
        
        Args:
            max_age_hours: Maximum age in hours for keeping task history
        """
        now = datetime.utcnow()
        cutoff = now - timedelta(hours=max_age_hours)
        to_remove = []
        
        for run_id, task in self._tasks.items():
            # Skip running tasks
            if task.status in ("pending", "running"):
                continue
            
            # Check age
            if task.completed_at and task.completed_at < cutoff:
                to_remove.append(run_id)
        
        for run_id in to_remove:
            self._tasks.pop(run_id, None)
            logger.debug(f"🗑️  Cleaned up old task for run {run_id}")
        
        if to_remove:
            logger.info(f"🧹 Cleaned up {len(to_remove)} old background tasks")
    
    async def start_periodic_cleanup(self, interval_hours: int = 1):
        """
        Start periodic cleanup of old tasks.
        
        Args:
            interval_hours: Cleanup interval in hours
        """
        if self._cleanup_task and not self._cleanup_task.done():
            logger.warning("Periodic cleanup already running")
            return
        
        async def cleanup_loop():
            while True:
                try:
                    await asyncio.sleep(interval_hours * 3600)
                    self.cleanup_old_tasks()
                except asyncio.CancelledError:
                    logger.info("Periodic cleanup cancelled")
                    break
                except Exception as e:
                    logger.error(f"Error in cleanup loop: {e}")
        
        self._cleanup_task = asyncio.create_task(cleanup_loop())
        logger.info(f"🔄 Started periodic task cleanup (every {interval_hours}h)")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get manager statistics.
        
        Returns:
            Dictionary with task counts by status
        """
        stats = {
            "total_tasks": len(self._tasks),
            "pending": 0,
            "running": 0,
            "completed": 0,
            "failed": 0,
        }
        
        for task in self._tasks.values():
            if task.status in stats:
                stats[task.status] += 1
        
        stats["active_handles"] = len(self._task_handles)
        return stats


# Global singleton instance
background_ingest_manager = BackgroundIngestManager()
