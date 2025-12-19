import { XIcon } from 'lucide-react';
import * as React from 'react';
import { createContext, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import classnames from '../utils/classnames.ts';
import mergeRefs from '../utils/mergeRefs.ts';
import useControllableState from '../utils/useControllableState.tsx';
import Slot from './Slot.tsx';

interface DialogProps extends React.ComponentPropsWithRef<'div'> {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    closeOnOutsideClick?: boolean;
    closeOnEscape?: boolean;
}

interface DialogContextValue {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

interface DialogProviderProps extends React.PropsWithChildren {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export const DialogProvider = ({ isOpen, setIsOpen, children }: DialogProviderProps) => {
    return <DialogContext.Provider value={{ isOpen, setIsOpen }}>{children}</DialogContext.Provider>;
};

export const useDialogContext = (): DialogContextValue => {
    return useContext(DialogContext)!;
};

const Dialog = ({
    ref,
    children,
    open,
    onOpenChange,
    closeOnOutsideClick,
    closeOnEscape = true,
    ...props
}: DialogProps) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const [isDialogOpen, setIsDialogOpen] = useControllableState(false, open, onOpenChange);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!closeOnEscape) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsDialogOpen(false);
                setOverflowDisabled(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!closeOnOutsideClick) return;

        setIsDialogOpen(false);
        setOverflowDisabled(false);
    };

    const setOverflowDisabled = (isDisabled: boolean) => {
        document.body.style.overflow = isDisabled ? 'hidden' : '';
    };

    useEffect(() => {
        if (isDialogOpen) {
            previousActiveElement.current = document.activeElement as HTMLElement;
            dialogRef.current?.focus();
            setOverflowDisabled(true);
        } else {
            setOverflowDisabled(false);
            previousActiveElement.current?.focus();
        }
    }, [isDialogOpen]);

    useEffect(() => {
        // on unmount
        return () => {
            setOverflowDisabled(false);
            previousActiveElement.current?.focus();
        };
    }, []);

    return createPortal(
        <DialogProvider isOpen={isDialogOpen} setIsOpen={setIsDialogOpen}>
            <div
                ref={mergeRefs(ref, dialogRef)}
                className={classnames('fixed inset-0 z-50', isDialogOpen ? 'block' : 'hidden')}
                tabIndex={-1}
                {...props}
            >
                <div className="fixed inset-0 bg-black/75" onClick={handleBackdropClick} />

                {children}
            </div>
        </DialogProvider>,
        document.body
    );
};

const DialogContent = ({
    children,
    className,
    asChild,
    ...props
}: React.ComponentPropsWithRef<'div'> & { asChild?: boolean }) => {
    const Component = asChild ? Slot : 'div';
    return (
        <Component
            className={classnames(
                'bg-white border border-divider/70 text-black text-base/7 shadow-2xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-8 pt-7 flex flex-col gap-8 max-h-[90vh] overflow-auto w-full outline-none max-w-[90%] !max-h-auto !h-auto rounded-5xl',
                className
            )}
            {...props}
        >
            {children}
        </Component>
    );
};

const DialogHeader = ({
    children,
    asChild,
    className,
    ...props
}: React.ComponentPropsWithRef<'div'> & { asChild?: boolean }) => {
    const Component = asChild ? Slot : 'div';
    return (
        <Component className={classnames('flex items-center justify-between gap-4', className)} {...props}>
            {children}
        </Component>
    );
};

const DialogTitle = ({
    children,
    asChild,
    className,
    ...props
}: React.ComponentPropsWithRef<'h1'> & { asChild?: boolean }) => {
    const Component = asChild ? Slot : 'h1';
    return (
        <Component
            className={classnames(
                'text-2xl font-semibold text-bright flex gap-4 justify-between items-center text-4xl/9 font-bold text-gray-900',
                className
            )}
            {...props}
        >
            {children}
        </Component>
    );
};

const DialogCloseButton = ({
    className,
    asChild,

    onClick,
    ...props
}: React.ComponentPropsWithRef<'button'> & { asChild?: boolean }) => {
    const Component = asChild ? Slot : 'button';

    const { setIsOpen } = useDialogContext();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        setIsOpen(false);
        onClick?.(e);
    };

    return (
        <Component
            className={classnames(
                'flex items-center justify-center text-2xl text-dimmed hover:text-bright rounded-md w-9 h-9 hover:bg-highlight cursor-pointer',
                className
            )}
            onClick={handleClick}
            {...props}
        >
            <XIcon strokeWidth={4} />
        </Component>
    );
};
export default Object.assign(Dialog, {
    Content: DialogContent,
    Title: DialogTitle,
    Header: DialogHeader,
    CloseButton: DialogCloseButton,
});
