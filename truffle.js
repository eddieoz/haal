// const Wallet = require('ethereumjs-wallet');
const { toWei, toHex } = require('web3-utils');
// const NonceTrackerSubprovider = require('web3-provider-engine/subproviders/nonce-tracker');
// const WalletProvider = require('truffle-wallet-provider');

// when deploying to a non-development network, add the private key of wallet being used into 'accounts.json'
// const accounts = require('./accounts');

// const keys = accounts.keys || [{ public: '', private: '' }];

// const wallet = Wallet.fromPrivateKey(Buffer.from(keys[0].private.slice(2), 'hex'));

// function createProvider(infuraUrl) {
//     return () => {
//         const hdWallet = new WalletProvider(wallet, infuraUrl);
//         const nonceTracker = new NonceTrackerSubprovider();
//         // eslint-disable-next-line no-underscore-dangle
//         hdWallet.engine._providers.unshift(nonceTracker);
//         nonceTracker.setEngine(hdWallet.engine);
//         return hdWallet;
//     };
// }


module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // to customize your Truffle configuration!
    networks: {
        development: {
            host: '127.0.0.1',
            port: 8545, // default port for ganachi-cli
            network_id: '*', // Match any network id
        },
        // rinkeby: {
        //     provider: createProvider('https://rinkeby.infura.io'),
        //     gas: 4600000,
        //     gasPrice: toHex(toWei('10', 'gwei')),
        //     network_id: '4',
        // },
        // mainnet: {
        //     provider: createProvider('https://mainnet.infura.io'),
        //     gas: 6000000,
        //     gasPrice: toHex(toWei('10', 'gwei')),
        //     network_id: '1',
        // },
        // ropsten: {
        //     provider: createProvider('https://ropsten.infura.io'),
        //     gas: 4600000,
        //     gasPrice: toHex(toWei('10', 'gwei')),
        //     network_id: '3',
        // },
        // kovan: {
        //     provider: createProvider('https://kovan.infura.io'),
        //     gas: 4600000,
        //     gasPrice: toHex(toWei('10', 'gwei')),
        //     network_id: '42',
        // },
    },
    // Configure your compilers
    compilers: {
        solc: {
          version: "0.4.25",    // Fetch exact version from solc-bin (default: truffle's version)
        // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
        // settings: {          // See the solidity docs for advice about optimization and evmVersion
        //  optimizer: {
        //    enabled: false,
        //    runs: 200
        //  },
        //  evmVersion: "byzantium"
        // }
        }
    }
};
