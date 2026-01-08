"""Logging configuration for ScholarMap application.

This module configures logging to output to both:
1. Console (stdout/stderr)
2. log.txt file in the repository root

All logs from ingestion, affiliation validation, and map operations
will be captured in both locations.
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

# Get repository root (parent of backend directory)
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
LOG_FILE = REPO_ROOT / "log.txt"


def setup_logging(level: int = logging.INFO) -> None:
    """
    Configure logging to output to both console and log.txt file.
    
    Args:
        level: Logging level (default: INFO)
    """
    # Create formatter
    formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    
    # File handler (log.txt)
    file_handler = logging.FileHandler(LOG_FILE, mode='a', encoding='utf-8')
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # Remove existing handlers to avoid duplicates
    root_logger.handlers.clear()
    
    # Add handlers
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    
    # Log initialization
    root_logger.info("=" * 80)
    root_logger.info("Logging initialized - output to console and log.txt")
    root_logger.info(f"Log file: {LOG_FILE}")
    root_logger.info("=" * 80)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name.
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)

