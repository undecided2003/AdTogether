# AdTogether Web SDK

[![npm version](https://img.shields.io/npm/v/@adtogether/web-sdk)](https://www.npmjs.com/package/@adtogether/web-sdk)

<p align="center">
  <strong>"Shown an ad, get ad shown"</strong><br>
  The Universal Ad Exchange & Reciprocal Marketing Platform
</p>

**AdTogether** is a state-of-the-art ad exchange platform designed to empower developers and creators. By participating in our network, you can engage in reciprocal marketing for your own applications while simultaneously driving traffic to your products. Our core philosophy is simple: **"Shown an ad, get ad shown"**.

This SDK allows web developers (React and Vanilla JS) to easily integrate AdTogether ads into their applications. By displaying ads from other community members, you earn "Ad Credits" that allow your own app's ads to be shown across the AdTogether network.

## Features

- **React Components**: Native React implementations like `AdTogetherBanner` for seamless integration.
- **Vanilla JS Support**: Core logic decoupled for use without frameworks.
- **Fair Exchange**: Automated tracking of impressions to ensure fair distribution of ad credits.
- **Easy Integration**: Minimal setup required to start showing ads.

## Getting started

Install via npm:

```bash
npm install @adtogether/web-sdk
```

## Usage (React)

```jsx
import { AdTogetherBanner } from '@adtogether/web-sdk/react';

function MyApp() {
  return (
    <div>
      <h1>My Awesome Web App</h1>
      
      {/* Display an Ad */}
      <AdTogetherBanner 
        appId="YOUR_APP_ID"
      />
    </div>
  );
}

export default MyApp;
```

## Additional information

- **Documentation**: For full documentation, visit [adtogether.relaxsoftwareapps.com/docs](https://adtogether.relaxsoftwareapps.com/docs).
- **Issues**: Found a bug? File an issue on our [GitHub repository](https://github.com/undecided2003/AdTogether/issues).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
