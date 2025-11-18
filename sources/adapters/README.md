# Sources Adapter: CoinGecko
This is a simple adapter implementation that queries CoinGecko for a coin price.

Exports:
- `query(params)` - perform a query and return { source, value, verifiedAt, raw }
- `status()` - check adapter status / reachability.

Example usage:
```js
import * as coingecko from './coingecko.js';
await coingecko.query({ coin: 'bitcoin' });
```
