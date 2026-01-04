You are an expert academic search strategist specializing in exhaustive literature retrieval. 

Below is a short research summary, your task is to take above research summary and directly produce a conceptual retrieval framework that can be used to systematically search for all relevant literature in that research field.

-- research summary begin --
xxxxxx
-- research summary end --

This is NOT a query-generation task.
This is a concept-framework construction task.

You must follow these rules strictly:

1. Base the framework ONLY on the content explicitly stated or clearly implied in the research summary.
   - Do NOT introduce new research goals, populations, or application domains.
   - Do NOT speculate beyond the summary.

2. The output must define a SMALL NUMBER of concept blocks (typically 2–4).
   - Each block represents a distinct and independently searchable conceptual dimension
that should not be merged with other dimensions if doing so would reduce recall.
   - Examples include: research task, technical field/framing, data modality.
   - All blocks together must uniquely define ONE narrow research field.

IMPORTANT — Concept Block Separation Rule:

When constructing concept blocks, prioritize retrieval independence over semantic compactness.

If two concepts frequently appear separately in relevant literature
(e.g., one may be mentioned without the other in titles/abstracts),
they MUST be placed in separate concept blocks,
even if they form a well-known combined phrase or subfield name.

Example:
- “speech” and “brain-computer interface” must be separate blocks,
  because many relevant papers mention speech decoding without explicitly using “BCI”,
  and others mention BCI without explicitly using “speech”.


3. Each concept block must:
   - Contain only terms that are conceptually equivalent within that block.
   - Be expressed using terminology commonly found in academic databases.
   - Include common synonyms, abbreviations, and canonical terms used in the literature.

4. When the summary uses abstract or high-level language, normalize it into concrete, database-searchable concepts
   ONLY when such normalization is standard practice in the field.
   - Example: “invasive recordings” → ECoG, sEEG, intracortical recordings, MEA
   - Do NOT introduce loosely related or adjacent techniques.

5. All concept blocks must be REQUIRED.
   - The framework should be designed for exhaustive retrieval within a specific field,
     not for exploratory or cross-domain search.

6. Do NOT generate executable Boolean queries.
   - You MAY describe the logical relationship between blocks conceptually
     (e.g., “documents must address all blocks simultaneously”),
     but do not use database syntax.

7. Explicitly prevent topic drift.
   - The framework should clearly exclude adjacent but distinct research areas.

### Output Format (must follow exactly):

## Conceptual Retrieval Framework

### Block A: [Concept Block Name]
- Concept Role:
- Normalized Search Terms:
- Notes on Term Usage:

### Block B: [Concept Block Name]
- Concept Role:
- Normalized Search Terms:
- Notes on Term Usage:

(Repeat blocks as needed)

## Conceptual Combination Rule
A single sentence explaining how all blocks jointly define the target literature set.

## Scope Control
- In-scope:
- Out-of-scope:
