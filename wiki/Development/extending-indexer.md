# Contributor Playbook: Extending the Indexer

This playbook guides you through adding new indexing capabilities to the NeuroSwarm search and discovery system.

## Overview

The Indexer provides:
- Full-text search across manifests
- Lineage tracing for data provenance
- Confidence scoring based on attestations
- Metadata filtering and aggregation

## Prerequisites

- [x] Completed [Getting Started](../../Getting-Started/Getting-Started.md)
- [x] Familiar with [Indexer API](../../../neuro-services/docs/indexer.md)
- [x] Understanding of [Data Structures](../../../neuro-services/docs/services.md)
- [x] Local development environment running

## Step 1: Understand Current Indexer Architecture

### 1.1 Review Existing Code
```bash
# Examine indexer implementation
cd neuro-services/src
cat index.ts | grep -A 20 "Indexer routes"

# Check data structures
grep -r "IndexItem" src/
```

### 1.2 Test Current Functionality
```bash
# Start services
npm run dev

# Test existing search
curl "http://localhost:3000/v1/index/search?q=neural"

# Test lineage queries
curl "http://localhost:3000/v1/index/lineage/QmTest123"
```

## Step 2: Plan Your Extension

### 2.1 Define Requirements
Choose what to add:
- [ ] New search field (tags, metadata, content type)
- [ ] Enhanced filtering (date ranges, size limits, quality scores)
- [ ] Aggregation features (statistics, trends, recommendations)
- [ ] New data source integration (IPFS, external APIs)

### 2.2 Design API Changes
```typescript
// Example: Add date range filtering
interface SearchRequest {
  q?: string;
  tag?: string;
  fromDate?: string;  // ISO date string
  toDate?: string;    // ISO date string
  minConfidence?: number;
}

// Example: Add aggregation endpoint
interface AggregationResult {
  totalManifests: number;
  averageConfidence: number;
  topTags: Array<{tag: string, count: number}>;
  contentTypeBreakdown: Record<string, number>;
}
```

## Step 3: Implement Indexer Changes

### 3.1 Extend Data Structures
```typescript
// Add to src/index.ts
interface ExtendedIndexItem extends IndexItem {
  contentType?: string;
  size?: number;
  createdAt: number;  // Add timestamp
  updatedAt: number;
  qualityScore?: number;
}

// Update mock data
const mockIndex: Record<string, ExtendedIndexItem> = {
  "QmTest123": {
    cid: "QmTest123",
    content: "neural network model data",
    tags: ["ai", "model"],
    lineage: ["QmParent1", "QmParent2"],
    confidence: 92,
    contentType: "model/neural-network",
    size: 1542000,  // bytes
    createdAt: Date.now() - 86400000,  // 1 day ago
    updatedAt: Date.now(),
    qualityScore: 8.5
  }
};
```

### 3.2 Add Search Filters
```typescript
// Enhanced search function
function searchIndex(params: SearchRequest): IndexItem[] {
  let results = Object.values(mockIndex);

  // Text search
  if (params.q) {
    results = results.filter(item =>
      item.content.toLowerCase().includes(params.q!.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(params.q!.toLowerCase()))
    );
  }

  // Tag filter
  if (params.tag) {
    results = results.filter(item => item.tags.includes(params.tag!));
  }

  // Date range filter (new)
  if (params.fromDate) {
    const fromTime = new Date(params.fromDate).getTime();
    results = results.filter(item => item.createdAt >= fromTime);
  }

  if (params.toDate) {
    const toTime = new Date(params.toDate).getTime();
    results = results.filter(item => item.createdAt <= toTime);
  }

  // Confidence filter (new)
  if (params.minConfidence) {
    results = results.filter(item => item.confidence >= params.minConfidence);
  }

  return results;
}
```

### 3.3 Add Aggregation Endpoint
```typescript
// New aggregation route
app.get("/v1/index/aggregate", (req, res) => {
  const items = Object.values(mockIndex);

  const result: AggregationResult = {
    totalManifests: items.length,
    averageConfidence: items.reduce((sum, item) => sum + item.confidence, 0) / items.length,
    topTags: getTopTags(items),
    contentTypeBreakdown: getContentTypeBreakdown(items)
  };

  res.json(result);
});

function getTopTags(items: ExtendedIndexItem[]): Array<{tag: string, count: number}> {
  const tagCounts: Record<string, number> = {};

  items.forEach(item => {
    item.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function getContentTypeBreakdown(items: ExtendedIndexItem[]): Record<string, number> {
  const breakdown: Record<string, number> = {};

  items.forEach(item => {
    const type = item.contentType || 'unknown';
    breakdown[type] = (breakdown[type] || 0) + 1;
  });

  return breakdown;
}
```

## Step 4: Update API Documentation

### 4.1 Update Search Endpoint
```typescript
// Update search route with new parameters
app.get("/v1/index/search", (req, res) => {
  const { q, tag, fromDate, toDate, minConfidence } = req.query;

  const params: SearchRequest = {
    q: q as string,
    tag: tag as string,
    fromDate: fromDate as string,
    toDate: toDate as string,
    minConfidence: minConfidence ? parseFloat(minConfidence as string) : undefined
  };

  const results = searchIndex(params);
  res.json({ results, total: results.length, params });
});
```

### 4.2 Update Indexer Documentation
Add to `docs/indexer.md`:

```markdown
### Enhanced Search Parameters
- `fromDate`: Filter by creation date (ISO 8601 format)
- `toDate`: Filter by creation date (ISO 8601 format)
- `minConfidence`: Minimum confidence score (0-100)

### New Endpoints

#### GET /v1/index/aggregate
Returns aggregated statistics about indexed content.

**Response:**
```json
{
  "totalManifests": 150,
  "averageConfidence": 87.5,
  "topTags": [
    {"tag": "ai", "count": 45},
    {"tag": "data", "count": 32}
  ],
  "contentTypeBreakdown": {
    "model/neural-network": 25,
    "dataset/training": 18,
    "unknown": 107
  }
}
```
```

## Step 5: Add Comprehensive Tests

### 5.1 Test New Search Features
```typescript
// Add to index.test.ts
describe("Enhanced Indexer Features", () => {
  it("should filter by date range", async () => {
    const fromDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
    const response = await request(app)
      .get(`/v1/index/search?fromDate=${fromDate}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.results)).toBe(true);
  });

  it("should filter by minimum confidence", async () => {
    const response = await request(app)
      .get("/v1/index/search?minConfidence=90");
    expect(response.status).toBe(200);
    response.body.results.forEach((item: any) => {
      expect(item.confidence).toBeGreaterThanOrEqual(90);
    });
  });

  it("should return aggregation statistics", async () => {
    const response = await request(app)
      .get("/v1/index/aggregate");
    expect(response.status).toBe(200);
    expect(response.body.totalManifests).toBeDefined();
    expect(response.body.averageConfidence).toBeDefined();
    expect(Array.isArray(response.body.topTags)).toBe(true);
  });
});
```

### 5.2 Run Tests
```bash
npm test
npm run test:coverage
```

## Step 6: Update Type Definitions

### 6.1 Update Shared Types
If your changes affect shared interfaces, update `neuro-shared`:

```typescript
// neuro-shared/src/types.ts
export interface SearchRequest {
  q?: string;
  tag?: string;
  fromDate?: string;
  toDate?: string;
  minConfidence?: number;
}

export interface AggregationResult {
  totalManifests: number;
  averageConfidence: number;
  topTags: Array<{tag: string, count: number}>;
  contentTypeBreakdown: Record<string, number>;
}
```

### 6.2 Publish Shared Library
```bash
cd neuro-shared
npm version patch
npm publish
```

## Step 7: Performance Testing

### 7.1 Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Create test script
# test-load.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: 'Search requests'
    requests:
      - get:
          url: '/v1/index/search'
          qs:
            q: 'neural'
```

### 7.2 Run Performance Tests
```bash
artillery run test-load.yml
```

## Step 8: Documentation and Review

### 8.1 Update All Documentation
- [x] Update `docs/indexer.md` with new features
- [x] Update `docs/services.md` with new interfaces
- [x] Update API examples in `docs/gateway.md`

### 8.2 Create Pull Request
```bash
# Create feature branch
git checkout -b feature/extend-indexer-search

# Commit changes
git add .
git commit -m "feat: extend indexer with date filtering and aggregation

- Add date range filtering to search API
- Implement confidence score filtering
- Create aggregation endpoint for statistics
- Update TypeScript interfaces
- Add comprehensive tests
- Update documentation"

# Push and create PR
git push origin feature/extend-indexer-search
```

## Troubleshooting

### Common Issues

**❌ Search not returning expected results:**
```typescript
// Debug search parameters
console.log('Search params:', params);
console.log('Results count:', results.length);
```

**❌ Type errors in shared library:**
```bash
# Rebuild shared types
cd neuro-shared
npm run build
cd ../neuro-services
npm install neuro-shared@latest
```

**❌ Performance issues:**
```bash
# Check query performance
curl "http://localhost:3000/v1/index/search?q=neural" -w "@curl-format.txt"
```

## Success Criteria

✅ **New features work:** Date filtering, confidence filtering, aggregation
✅ **Tests pass:** All existing + new tests pass
✅ **Documentation updated:** API docs reflect new capabilities
✅ **Performance acceptable:** Response times under 100ms
✅ **Type safety maintained:** No TypeScript errors

## Next Steps

- [ ] Add more aggregation features (trending, recommendations)
- [ ] Implement caching for better performance
- [ ] Add real-time indexing for live data
- [ ] Create indexer plugins for custom data sources

---

**Time Estimate:** 4-8 hours for implementation + testing
**Difficulty:** Intermediate (requires API design and testing knowledge)
**Impact:** Enhances search capabilities for all users