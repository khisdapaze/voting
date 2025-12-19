import React, { useState } from 'react';

import { PrimaryButton, SecondaryButton } from './Button.tsx';
import Dialog from './Dialog.tsx';
import Theme from './Theme.tsx';
import classnames from '../utils/classnames.ts';

export const useConfirmDialog = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [resolveCallback, setResolveCallback] = useState<((value: boolean) => void) | null>(null);

    const confirm = () => {
        return new Promise((resolve) => {
            setIsOpen(true);
            setResolveCallback(() => resolve);
        });
    };

    const handleCancelClick = () => {
        resolveCallback?.(false);
        setIsOpen(false);
    };

    const handleConfirmClick = () => {
        resolveCallback?.(true);
        setIsOpen(false);
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            resolveCallback?.(false);
        }
        setIsOpen(open);
    };

    const ConfirmDialog = ({
        title = 'Confirm',
        message = 'Are you sure?',
        submitLabel = 'Confirm',
        cancelLabel = 'Cancel',
        danger = false,
    }: {
        title?: React.ReactNode;
        message?: React.ReactNode;
        submitLabel?: React.ReactNode;
        cancelLabel?: React.ReactNode;
        danger?: boolean;
    }) =>
        isOpen && (
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <Theme theme="gray">
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>{title}</Dialog.Title>
                            <Dialog.CloseButton />
                        </Dialog.Header>

                        <p className="text-black">{message}</p>

                        <div className="flex flex-col flex-wrap gap-3 justify-end mt-2">
                            <PrimaryButton
                                onClick={handleConfirmClick}
                                className={classnames(
                                    'whitespace-nowrap',
                                    danger ? 'bg-red-600 hover:bg-red-700 active:bg-red-800' : ''
                                )}
                            >
                                {submitLabel}
                            </PrimaryButton>

                            <SecondaryButton onClick={handleCancelClick} className="whitespace-nowrap bg-transparent">
                                {cancelLabel}
                            </SecondaryButton>
                        </div>
                    </Dialog.Content>
                </Theme>
            </Dialog>
        );

    return { confirm, ConfirmDialog };
};
