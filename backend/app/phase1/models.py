from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class Slots(BaseModel):
    research_goal: str = ""
    task: list[str] = Field(default_factory=list)
    method_measurement: list[str] = Field(default_factory=list)
    method_algorithm: list[str] = Field(default_factory=list)
    subject_population: list[str] = Field(default_factory=list)
    signal_feature: list[str] = Field(default_factory=list)
    output_target: list[str] = Field(default_factory=list)
    context: list[str] = Field(default_factory=list)


class Paper(BaseModel):
    title: str = ""
    authors: list[str] = Field(default_factory=list)
    year: int | None = None
    venue: str | None = None
    abstract: str | None = None
    doi: str | None = None
    pmid: str | None = None
    url: str | None = None
    source: Literal["pubmed", "semantic_scholar", "openalex"]
    raw: dict[str, Any] = Field(default_factory=dict)


class QueryOutputs(BaseModel):
    pubmed: str = ""
    pubmed_full: str = ""
    semantic_scholar: str = ""
    openalex: str = ""


class Phase1Result(BaseModel):
    run_id: str
    max_results_per_source: int
    counts: dict[str, int]
    aggregated_count: int
