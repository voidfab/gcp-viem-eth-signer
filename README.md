# GCP Viem ETH Signer

## Overview
`GCP Viem ETH Signer` is a Node.js module that provides functionality to transform GCP Key Management Service (KMS) credentials into Viem-compatible Ethereum accounts. This module allows you to interact with GCP KMS for secure signing operations using your Ethereum keys stored in the Google Cloud Platform.

## Features
- Retrieve public keys from GCP Key Ring.
- Sign hashes, messages, transactions, and typed data using GCP KMS.
- Recover signatures from signed hashes.
- Convert KMS credentials to Viem Ethereum accounts.
- Modular and reusable code design.

## Installation
You can install the necessary dependencies using npm:

```bash
npm install @google-cloud/kms @noble/curves viem asn1js
```

## Directory Structure
```
src/
  class/
    index.ts
    toViem.ts
  modules/
    gcpToViem.ts
  utils/
    asn1.ts
    gcp.ts
  global.d.ts
```

## Usage

### Import the Module
```typescript
import { gcpToViem } from './modules/gcpToViem';
```

### Convert GCP Key Ring Credentials to Viem Account
```typescript
// Example usage
const kmsClient = new KeyManagementServiceClient();
const hsmKeyVersion = 'projects/YOUR_PROJECT/locations/YOUR_LOCATION/keyRings/YOUR_KEYRING/cryptoKeys/YOUR_KEY/cryptoKeyVersions/YOUR_KEY_VERSION';

(async () => {
  try {
    const cloudDerivedAccount = await gcpToViem({ hsmKeyVersion, kmsClient });
    console.log('Successfully created Viem account:', cloudDerivedAccount);
  } catch (error) {
    console.error('Error creating Viem account:', error);
  }
})();
```

### Function Documentation
#### `gcpToViem`

**Description**: Convert GCP Key Ring credentials to a Viem account.

**Parameters**:
- `param0`: An object containing the HSM key version and the optional KMS client.
  - `hsmKeyVersion` (string): The HSM key version identifier.
  - `kmsClient` (KeyManagementServiceClient, optional): The KMS client.

**Returns**: A Promise that resolves to a `CloudDerivedAccount`.

### Example
Here's an example of an implementation using the `gcpToViem` function:

```typescript
import { gcpToViem } from './modules/gcpToViem';
import { KeyManagementServiceClient } from '@google-cloud/kms';

const hsmKeyVersion = 'projects/YOUR_PROJECT/locations/YOUR_LOCATION/keyRings/YOUR_KEYRING/cryptoKeys/YOUR_KEY/cryptoKeyVersions/YOUR_KEY_VERSION';

async function main() {
  const kmsClient = new KeyManagementServiceClient();

  try {
    const cloudDerivedAccount = await gcpToViem({ hsmKeyVersion, kmsClient });

    console.log('Ethereum Address:', cloudDerivedAccount.address);

    // You can now use the derived account to sign messages, transactions, etc.
    const message = 'Hello, Ethereum!';
    const signedMessage = await cloudDerivedAccount.signMessage({ message });
    console.log('Signed Message:', signedMessage);
  } catch (error) {
    console.error('Error creating Viem account:', error);
  }
}

main();
```

## Contributing
Contributions are welcome! If you'd like to contribute, please fork the repository, make your changes, and submit a pull request.

## License
This project is licensed under the MIT License.

## Acknowledgements
- [Google Cloud KMS](https://cloud.google.com/kms)
- [Viem](https://github.com/viem/viem)
- [ASN1.js](https://github.com/PeculiarVentures/ASN1.js/)
