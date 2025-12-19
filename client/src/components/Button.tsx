import React, { useState } from 'react';
import Slot, { type Slottable } from './Slot.tsx';
import classnames from '../utils/classnames.ts';

type ButtonProps = Omit<React.ComponentPropsWithRef<'button'>, 'onClick'> &
    Slottable & {
        onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
    };

const MIN_LOADING_TIME_MS = 500;

const useAsyncClick = (onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!onClick) return;

        const result = onClick(e);

        if (result instanceof Promise) {
            setIsLoading(true);
            const startTime = Date.now();

            try {
                await result;
            } finally {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, MIN_LOADING_TIME_MS - elapsed);

                if (remaining > 0) {
                    setTimeout(() => setIsLoading(false), remaining);
                } else {
                    setIsLoading(false);
                }
            }
        }
    };

    return { isLoading, onClick: handleClick };
};

export const PrimaryButton = ({ className, disabled, asChild, onClick, ...props }: ButtonProps) => {
    const { isLoading, onClick: handleClick } = useAsyncClick(onClick);
    const Component = asChild ? Slot : 'button';

    return (
        <Component
            className={classnames(
                'rounded-5xl bg-theme-800 text-white text-2xl font-semibold py-4 px-6 flex items-center gap-4 justify-center',
                !disabled && !isLoading
                    ? 'hover:bg-theme-900 active:bg-theme-950 cursor-pointer opacity-100'
                    : 'opacity-50 cursor-not-allowed pointer-events-none',
                isLoading && 'animate-pulse',
                className
            )}
            disabled={disabled || isLoading}
            onClick={handleClick}
            {...props}
        />
    );
};

export const SecondaryButton = ({ className, disabled, asChild, onClick, ...props }: ButtonProps) => {
    const { isLoading, onClick: handleClick } = useAsyncClick(onClick);
    const Component = asChild ? Slot : 'button';

    return (
        <Component
            className={classnames(
                'rounded-5xl bg-theme-100 text-theme-800 text-2xl font-semibold py-4 px-6 flex items-center gap-4 justify-center',
                !disabled && !isLoading
                    ? ' hover:text-theme-950 hover:bg-theme-200 cursor-pointer active:bg-theme-300 opacity-100'
                    : 'opacity-50 cursor-not-allowed pointer-events-none',
                isLoading && 'animate-pulse',
                className
            )}
            disabled={disabled || isLoading}
            onClick={handleClick}
            {...props}
        />
    );
};
