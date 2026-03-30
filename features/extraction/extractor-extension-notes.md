# Gemini Extractor Extension Notes

The current extractor combines the release's current document set into one release-level summary. Extend document handling by adding pre-processing or prompt guidance per document family, not by branching in page files.

## Recommended extension points

- prompt shaping: [`/home/brandon/code/shop-metrics/features/extraction/gemini-service.ts`](/home/brandon/code/shop-metrics/features/extraction/gemini-service.ts)
- normalization and editable schema: [`/home/brandon/code/shop-metrics/features/extraction/normalization.ts`](/home/brandon/code/shop-metrics/features/extraction/normalization.ts)
- retry/review/approval actions: [`/home/brandon/code/shop-metrics/features/extraction/actions.ts`](/home/brandon/code/shop-metrics/features/extraction/actions.ts)

## Document-type-specific examples

- `BASELINE_PACKET`: bias prompts toward expected panels, material totals, and due dates.
- `REVISION_PACKET`: bias prompts toward revision notes and changed release totals.
- `QUALITY_CERT`: pull accessory or compliance-related notes into `additionalSummaryFields`.
- `ROUTER_PDF`: emphasize part totals and material breakdowns.

## If a family needs custom parsing

Add a document-family adapter that returns:

- extra prompt instructions
- optional pre-extracted text blocks
- field emphasis weights

Then merge those adapters into the release-level Gemini request before calling the abstraction layer.
