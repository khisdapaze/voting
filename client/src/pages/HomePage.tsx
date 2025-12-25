import classnames from '../utils/classnames.ts';
import React, { useState } from 'react';
import type { Poll, User } from '../data/types.ts';
import { ArchiveIcon, PlusIcon, RefreshCcwIcon } from 'lucide-react';
import Theme from '../components/Theme.tsx';
import { generatePath, Link } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { SecondaryButton } from '../components/Button.tsx';
import { useQuery } from '@tanstack/react-query';
import { listPollsQuery } from '../data/api.ts';
import { removeJwt, useViewer } from '../contexts/AuthenticationContext.tsx';
import Page from '../components/Page.tsx';

const PollCardLink = ({ poll, className, ...props }: React.ComponentPropsWithRef<typeof Link> & { poll: Poll }) => {
    const isOpen = poll.status === 'OPEN';

    return (
        <Theme theme={poll.colorScheme?.toLowerCase() as any} base="gray">
            <Link
                className={classnames(
                    'bg-theme-100 flex flex-col gap-6 p-6 rounded-6xl hover:bg-theme-200 active:bg-theme-300 group cursor-pointer',
                    className
                )}
                {...props}
            >
                <div className="flex justify-start">
                    <span className="rounded-full px-2 font-semibold text-2xl text-theme-800 opacity-50 -mb-2">
                        {poll.createdBy?.name} fragt:
                    </span>
                </div>

                <h1 className="text-3xl font-bold  text-theme-800 hyphens-auto text-balance px-2 py-2">{poll.title}</h1>

                {isOpen ? (
                    <div className="rounded-5xl bg-theme-800 text-white text-2xl font-semibold py-4 px-6 text-center mt-auto group-hover:bg-theme-900 group-active:bg-theme-950">
                        Zur Abstimmung
                    </div>
                ) : (
                    <div className="rounded-5xl bg-theme-50 text-theme-800 text-2xl font-semibold py-4 px-6 text-center mt-auto group-hover:bg-theme-100 group-active:bg-theme-200">
                        Ergebnisse anzeigen
                    </div>
                )}
            </Link>
        </Theme>
    );
};

const UserChip = ({ className, user, ...props }: React.ComponentPropsWithRef<'div'> & { user: User }) => {
    return (
        <div
            className={classnames(
                'inline-flex items-center gap-3 bg-gray-100 p-2 pr-4 rounded-full text-4.5xl/1 font-semibold text-gray-800',
                className
            )}
            {...props}
        >
            <img src={user.imageUrl} className="rounded-full w-10 h-10" referrerPolicy="no-referrer" />
            <span>{user.name}</span>
        </div>
    );
};

const HomeHeader = () => {
    const viewer = useViewer();

    const handleUserChipClick = () => {
        removeJwt();
        window.location.reload();
    };

    return (
        <header className="py-10 px-6">
            <h1 className="text-4.5xl/13 font-bold  text-black flex items-center justify-center gap-3">
                Hallo,{' '}
                <UserChip
                    user={viewer!}
                    onClick={handleUserChipClick}
                    className="cursor-pointer hover:bg-gray-200 active:bg-gray-300"
                />
            </h1>
        </header>
    );
};

const HomePolls = ({ className, polls, ...props }: React.ComponentPropsWithRef<'div'> & { polls?: Poll[] }) => {
    return (
        <div
            className={classnames(
                'flex flex-col min-h-full w-full p-6 gap-10 bg-white justify-start flex-1',
                className
            )}
            {...props}
        >
            {polls?.map((poll) => (
                <PollCardLink key={poll.id} poll={poll} to={generatePath(ROUTES.POLL_DETAIL, { pollId: poll.id })} />
            ))}

            {!polls ? (
                <div className="text-center text-gray-500 text-2xl font-medium py-12 text-balance flex-1 flex items-center justify-center">
                    Lade Abstimmungen...
                </div>
            ) : null}

            {polls && polls.length === 0 ? (
                <div className="text-center text-gray-500 text-2xl font-medium p-12 text-balance flex-1 flex items-center justify-center">
                    Keine offenen Abstimmungen verfügbar.
                </div>
            ) : null}
        </div>
    );
};

const AddPollButtons = ({
    className,
    onRefetch,
    ...props
}: React.ComponentPropsWithRef<'div'> & { onRefetch: () => void }) => {
    return (
        <div
            className={classnames('flex flex-col min-h-full w-full p-6 gap-6 bg-white justify-start', className)}
            {...props}
        >
            <SecondaryButton onClick={onRefetch}>
                <RefreshCcwIcon strokeWidth={2.5} />
                Liste aktualisieren
            </SecondaryButton>

            <SecondaryButton asChild>
                <Link to={generatePath(ROUTES.POLL_CREATE)}>
                    <PlusIcon strokeWidth={2.5} />
                    Neue Abstimmung erstellen
                </Link>
            </SecondaryButton>
        </div>
    );
};

const HomePage = () => {
    const { data: polls, refetch } = useQuery(listPollsQuery());
    const openPolls = polls?.filter((poll) => poll.status === 'OPEN');
    const closedPolls = polls?.filter((poll) => poll.status === 'CLOSED');

    const [isClosedPollsVisible, setIsClosedPollsVisible] = useState(false);

    return (
        <Theme theme="gray" base="gray">
            <Page>
                <Page.Inner className="flex-1">
                    <HomeHeader />

                    <HomePolls polls={openPolls} className="pt-0" />

                    <AddPollButtons onRefetch={() => refetch()} />

                    {closedPolls && closedPolls.length > 0 && (
                        <>
                            <div className="flex flex-col px-6 pt-0 pb-6">
                                {!isClosedPollsVisible ? (
                                    <SecondaryButton onClick={() => setIsClosedPollsVisible(true)}>
                                        <ArchiveIcon strokeWidth={2.5} />
                                        Abgeschlossene anzeigen
                                    </SecondaryButton>
                                ) : (
                                    <SecondaryButton onClick={() => setIsClosedPollsVisible(false)}>
                                        Abgeschlossene verbergen
                                    </SecondaryButton>
                                )}
                            </div>

                            {isClosedPollsVisible && <HomePolls polls={closedPolls} className="pb-10" />}
                        </>
                    )}
                </Page.Inner>
            </Page>
        </Theme>
    );
};

export default HomePage;
