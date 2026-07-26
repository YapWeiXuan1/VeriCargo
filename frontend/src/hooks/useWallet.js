import { useState } from 'react';
import { connectMetaMask } from '../services/metamaskService';

function useMetamask() {
    const [account, setAccount] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const connect = async () => {
        setLoading(true);
        setError(null);
        try {
            const address = await connectMetaMask();
            setAccount(address);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { account, error, loading, connect };
}

export default useMetamask;