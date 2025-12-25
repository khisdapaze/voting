import classnames from '../utils/classnames.ts';
import React, { useEffect, useState } from 'react';
import type { Poll } from '../data/types.ts';
import Theme from '../components/Theme.tsx';
import { generatePath, Link, useParams, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { useConfirmDialog } from '../components/ConfirmDialog.tsx';
import { PrimaryButton, SecondaryButton } from '../components/Button.tsx';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getPollQuery, voteInPollMutation } from '../data/api.ts';
import { useViewer } from '../contexts/AuthenticationContext.tsx';
import Page from '../components/Page.tsx';

export const PollHeader = ({ className, poll, ...props }: React.ComponentPropsWithRef<'header'> & { poll: Poll }) => {
    return (
        <header className={classnames('flex flex-col gap-4 p-6 py-8 bg-theme-100', className)} {...props}>
            <div className="flex items-center justify-between -mt-2">
                <span className="rounded-full font-semibold text-2xl text-theme-800 opacity-50">
                    {poll.createdBy?.name} fragt:
                </span>

                <SecondaryButton asChild className="p-2 px-4">
                    <Link to={generatePath(ROUTES.HOME)}>Abbrechen</Link>
                </SecondaryButton>
            </div>

            <h1 className="text-5xl/13 font-bold  text-theme-800 hyphens-auto text-balance">
                <Link to={generatePath(ROUTES.POLL_DETAIL, { pollId: poll.id })}>{poll.title}</Link>
            </h1>
        </header>
    );
};

const SingleChoiceIndicator = ({
    isSelected,
    className,
    ...props
}: React.ComponentPropsWithRef<'span'> & {
    isSelected: boolean;
}) => {
    return (
        <span
            className={classnames(
                'rounded-full bg-white flex items-center justify-center w-7 h-7 border-4 border-theme-800',
                isSelected ? 'border-theme-800' : 'border-theme-200 group-hover:border-theme-300',
                className
            )}
            {...props}
        >
            {isSelected && <span className="block w-3 h-3 bg-theme-800 rounded-full" />}
        </span>
    );
};

const MultipleChoiceIndicator = ({
    isSelected,
    className,
    ...props
}: React.ComponentPropsWithRef<'span'> & {
    isSelected: boolean;
}) => {
    return (
        <span
            className={classnames(
                'rounded-lg bg-white flex items-center justify-center w-7 h-7 border-4 border-theme-800',
                isSelected ? 'border-theme-800' : 'border-theme-200 group-hover:border-theme-300',
                className
            )}
            {...props}
        >
            {isSelected && <span className="block w-3 h-3 bg-theme-800 rounded-sm" />}
        </span>
    );
};

export const OptionButton = ({
    className,
    children,
    isSelected = false,
    isMultipleChoice = false,
    isReadOnly = false,
    disabled,
    ...props
}: React.ComponentPropsWithRef<'button'> & {
    isSelected?: boolean;
    isMultipleChoice?: boolean;
    isReadOnly?: boolean;
    children?: React.ReactNode;
}) => {
    return (
        <button
            className={classnames(
                'rounded-5xl text-theme-900 text-2xl font-semibold flex-1 py-4 px-5 text-left flex items-center gap-3 border-4 group',
                isSelected ? 'bg-theme-300  border-theme-800' : 'bg-white border-theme-200',
                !isSelected && !isReadOnly && 'hover:border-theme-300 hover:bg-theme-200',
                !isReadOnly && !disabled && 'cursor-pointer',
                disabled && 'opacity-50',
                className
            )}
            {...props}
            disabled={disabled}
            type="button"
        >
            {!isReadOnly &&
                (isMultipleChoice ? (
                    <MultipleChoiceIndicator isSelected={isSelected} />
                ) : (
                    <SingleChoiceIndicator isSelected={isSelected} />
                ))}

            {children}
        </button>
    );
};

const PollForm = ({
    poll,
    className,
    onValuesSubmit,
    ...props
}: React.ComponentPropsWithRef<'form'> & { poll?: Poll; onValuesSubmit?: (values: string[]) => void }) => {
    const [values, setValues] = useState<string[]>([]);

    const handleOptionToggle = (optionId: string) => {
        if (poll?.choiceType === 'MULTIPLE') {
            setValues((prevValues) =>
                prevValues.includes(optionId) ? prevValues.filter((id) => id !== optionId) : [...prevValues, optionId]
            );
        } else {
            setValues([optionId]);
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await onValuesSubmit?.(values);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form
            className={classnames('flex flex-col justify-between gap-8 p-6 py-8 bg-theme-100', className)}
            {...props}
            onSubmit={handleSubmit}
        >
            <div className="flex flex-col gap-6">
                {poll?.options.map((option: string) => (
                    <OptionButton
                        key={option}
                        isMultipleChoice={poll?.choiceType === 'MULTIPLE'}
                        isSelected={values.includes(option)}
                        onClick={() => handleOptionToggle(option)}
                    >
                        {option}
                    </OptionButton>
                ))}
            </div>

            <div className="flex flex-col gap-6">
                <PrimaryButton disabled={values.length === 0} isLoading={isSubmitting}>
                    Absenden
                </PrimaryButton>
            </div>
        </form>
    );
};

const PollResults = ({ poll, className, ...props }: React.ComponentPropsWithRef<'div'> & { poll?: Poll }) => {
    const totalVotes = Object.values(poll?.results || {}).reduce((sum, count) => sum + count, 0);
    const maxVotes = Math.max(...Object.values(poll?.results || {}), 1);

    return (
        <div className={classnames('flex flex-col justify-between gap-8 p-6 py-8 bg-theme-100', className)} {...props}>
            <div className="flex flex-col gap-6">
                {poll?.options.map((option: string) => {
                    const isMax = poll?.results?.[option] === maxVotes;
                    return (
                        <OptionButton
                            key={option}
                            isReadOnly
                            className={classnames(
                                'relative overflow-hidden',
                                poll?.results?.[option] === maxVotes ? 'border-theme-800' : 'opacity-50'
                            )}
                        >
                            <div className="w-full flex gap-2 justify-between items-center relative z-10">
                                <span className="">{option}</span>

                                <span
                                    className={classnames(
                                        'text-2xl font-semibold',
                                        isMax ? 'text-theme-900' : 'text-theme-900 opacity-50'
                                    )}
                                >
                                    {poll?.results?.[option] || 0} Stimmen
                                </span>
                            </div>

                            <div
                                className={classnames(
                                    'absolute rounded-full top-0 left-0 z-0 h-full',
                                    isMax ? 'bg-theme-300' : 'bg-theme-50'
                                )}
                                style={{
                                    width: `${((poll?.results?.[option] || 0) / totalVotes) * 100}%`,
                                }}
                            />
                        </OptionButton>
                    );
                })}
            </div>

            <SecondaryButton asChild className="bg-theme-200 hover:bg-theme-300 active:bg-theme-400">
                <Link to={generatePath(ROUTES.HOME)}>Schließen</Link>
            </SecondaryButton>
        </div>
    );
};

const PollWaitingForResults = ({ poll, className, ...props }: React.ComponentPropsWithRef<'div'> & { poll?: Poll }) => {
    return (
        <div className={classnames('flex flex-col justify-between gap-8 p-6 py-8 bg-theme-100', className)} {...props}>
            <div className="flex flex-col gap-6 items-center justify-center flex-1 pb-10 opacity-70">
                <span className="text-2xl/8 font-medium text-theme-800 text-center text-balance">
                    Die Ergebnisse werden hier automatisch angezeigt, sobald die Abstimmung abgeschlossen ist.
                </span>
            </div>

            <SecondaryButton asChild className="bg-theme-200 hover:bg-theme-300 active:bg-theme-400">
                <Link to={generatePath(ROUTES.HOME)}>Schließen</Link>
            </SecondaryButton>
        </div>
    );
};

const PollDetailPage = () => {
    const { pollId } = useParams();

    const viewer = useViewer();

    // for people that obtain a secret link
    const [searchParams] = useSearchParams();
    const secretParam = searchParams.get('secret') || undefined;

    const { data: poll, refetch } = useQuery(getPollQuery(pollId || '', secretParam));
    const { mutateAsync: vote, isPending } = useMutation(voteInPollMutation(pollId || ''));

    const [isSubmitted, setIsSubmitted] = useState(false);

    const pollUser = poll?.users?.find((user) => user.email === viewer?.email);
    const isVoted = pollUser?.status === 'VOTED' || isPending || isSubmitted;
    const isClosed = poll?.status === 'CLOSED';

    useEffect(() => {
        if (!poll || !isVoted || isClosed) return;

        const intervalId = setInterval(() => {
            refetch();
        }, 5000);

        return () => clearInterval(intervalId);
    }, [poll, isVoted, isClosed]);

    const { confirm, ConfirmDialog } = useConfirmDialog();

    const handleFormValuesSubmit = async (values: string[]) => {
        const confirmed = await confirm();
        if (!confirmed) return;

        setIsSubmitted(true);

        await vote({ values, secret: secretParam });
        await refetch();
    };

    if (!poll) {
        return (
            <Page>
                <Page.Inner className="flex-1 flex items-center justify-center text-gray-500 text-2xl font-medium py-12">
                    Lade Abstimmung...
                </Page.Inner>
            </Page>
        );
    }

    const isViewerOwner = poll.createdBy!.email === viewer?.email;

    return (
        <Theme theme={poll.colorScheme?.toLowerCase() as any} base="gray">
            <Page>
                <div className="bg-theme-100 w-full flex flex-col items-center flex-1">
                    <Page.Inner className="flex-1">
                        <PollHeader poll={poll} />
                        {!isVoted && !isClosed ? (
                            <PollForm poll={poll} className="flex-1" onValuesSubmit={handleFormValuesSubmit} />
                        ) : isClosed ? (
                            <PollResults poll={poll} className="flex-1" />
                        ) : (
                            <PollWaitingForResults poll={poll} className="flex-1" />
                        )}
                    </Page.Inner>
                </div>

                <Page.Inner>
                    {isViewerOwner && (
                        <Theme theme="gray" base="gray">
                            <div className="p-6 bg-white">
                                <SecondaryButton asChild>
                                    <Link to={generatePath(ROUTES.POLL_MANAGE, { pollId: poll!.id })}>
                                        Abstimmung verwalten
                                    </Link>
                                </SecondaryButton>
                            </div>
                        </Theme>
                    )}
                </Page.Inner>

                <ConfirmDialog
                    title="Stimme absenden"
                    message={
                        <span className="flex flex-col gap-8 my-4">
                            <span className="text-gray-600 text-2xl/8 font-medium">
                                Nach dem Absenden deiner Stimme kannst du deine Wahl nicht mehr ändern.
                            </span>
                            <span className="text-gray-600 text-2xl/8 font-medium">
                                Bist du dir sicher, dass du fortfahren möchtest?
                            </span>
                        </span>
                    }
                    submitLabel="Stimme absenden"
                    cancelLabel="Abbrechen"
                />
            </Page>
        </Theme>
    );
};

export default PollDetailPage;
