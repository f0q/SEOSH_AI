---
trigger: model_decision
description: every time you make global changes (new router, new page, schema change, new external API)
---

## Architecture Doc Update

When making global changes, update `docs/architecture.md` as part of the same commit. Global changes include:

- Adding or removing a tRPC router
- Adding or removing a page/route in `src/app/`
- Changing the Prisma schema (new model, new field, changed relation)
- Adding a new external API integration (text.ru, Pixeltools, SMTP, etc.)
- Changing the auth flow or session model
- Adding a new env variable

Update specifically:
1. **Repository Structure** tree (if new directories/files created)
2. **Module Status** table (if a module moved from stub → partial → done)
3. **Data Flow** diagrams (if a new flow was introduced or changed)
4. **Environment Variables** table (if new env vars added)

## Semantic Core ↔ Content Planner Awareness

When modifying either `semanticCore.ts` or `contentPlan.ts`, keep in mind the bridge between them:
- Semantic Core Step 3 should output: **category, section, pageType, schemaType** (not just category)
- Page Type taxonomy: `homepage`, `service_listing`, `service_detail`, `product_listing`, `product_detail`, `landing_page`, `blog_listing`, `blog_post`, `promo_listing`, `promo_detail`, `info_page`
- Each page type has a default Schema.org type and target word count
- The planned "Generate Content Plan from Semantic Core" mutation bridges the two modules

Reference: `_temp/index.html` (client SEO plan example for fackturaf.com)