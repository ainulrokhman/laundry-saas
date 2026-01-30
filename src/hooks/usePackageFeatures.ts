import { useState, useEffect } from 'react';
import { PackageFeature, PackageDefinition } from '@/constants/packageFeatures';

interface PackageInfo {
    package: PackageDefinition;
    isExpired: boolean;
    expiresAt: string | null;
    features: PackageFeature[];
}

export function usePackageFeatures() {
    const [data, setData] = useState<PackageInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        async function fetchPackage() {
            try {
                const res = await fetch('/api/dashboard/subscription/current-package');
                if (!res.ok) {
                    throw new Error('Failed to fetch package info');
                }
                const json = await res.json();
                setData(json);
            } catch (err: any) {
                setError(err);
                console.error('Error in usePackageFeatures:', err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchPackage();
    }, []);

    const hasFeature = (feature: PackageFeature): boolean => {
        if (!data) return false;
        // If expired, the backend already returns filtered features (KUCEK features)
        // So we just check inclusion.
        return data.features.includes(feature);
    };

    const isPro = data?.package?.slug !== 'kucek';

    return {
        package: data?.package,
        features: data?.features || [],
        isExpired: data?.isExpired || false,
        expiresAt: data?.expiresAt ? new Date(data.expiresAt) : null,
        isLoading,
        error,
        hasFeature,
        isPro,
    };
}
