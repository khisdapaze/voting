import Theme from '../components/Theme.tsx';
import React, { useState } from 'react';
import type { Poll, User } from '../data/types.ts';
import classnames from '../utils/classnames.ts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createPollUsersMutation, getPollQuery, listUsersQuery } from '../data/api.ts';
import { PrimaryButton, SecondaryButton } from '../components/Button.tsx';
import { generatePath, Link, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { OptionButton, PollHeader } from './PollDetailPage.tsx';
import QrCode from '../components/QrCode.tsx';
import Page from '../components/Page.tsx';

const CreatePollHeader = () => {
    return (
        <header className="flex flex-col gap-4 p-6 py-8">
            <h1 className="text-4.5xl/13 font-bold  text-black flex items-center gap-3">Abstimmung teilen</h1>
        </header>
    );
};

const InviteUsersForm = ({
    className,
    onFormValuesSubmit,
    poll,
    users,
    ...props
}: React.ComponentPropsWithRef<'form'> & {
    onFormValuesSubmit?: (values: { users: User[] }) => Promise<void>;
    poll: Poll;
    users: User[];
}) => {
    const pollUsersEmails = (poll.users || []).map((user) => user.email);
    const otherUsers = users?.filter((user) => !pollUsersEmails.includes(user.email));
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    const handleUserToggle = (userId: string) => {
        setSelectedUsers((prevSelectedUsers) =>
            prevSelectedUsers.includes(userId)
                ? prevSelectedUsers.filter((id) => id !== userId)
                : [...prevSelectedUsers, userId]
        );
    };

    const handleSelectAllUsers = () => {
        setSelectedUsers(otherUsers.map((user) => user.email));
    };

    const handleResetSelection = () => {
        setSelectedUsers([]);
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);
        try {
            await onFormValuesSubmit?.({
                users: selectedUsers
                    .map((email) => otherUsers.find((u) => u.email === email))
                    .filter(Boolean) as User[],
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form
            className={classnames('flex flex-col min-h-full w-full p-6 gap-4 bg-white justify-start', className)}
            onSubmit={handleSubmit}
            {...props}
        >
            <SecondaryButton className="justify-start" type="button" onClick={handleSelectAllUsers}>
                Alle auswählen
            </SecondaryButton>

            <SecondaryButton className="justify-start" type="button" onClick={handleResetSelection}>
                Zurücksetzen
            </SecondaryButton>

            {users?.map((user) => (
                <OptionButton
                    key={user.name}
                    isMultipleChoice
                    className="w-full"
                    onClick={() => handleUserToggle(user.email)}
                    isSelected={selectedUsers.includes(user.email) || pollUsersEmails.includes(user.email)}
                    disabled={pollUsersEmails.includes(user.email)}
                >
                    <span className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-xl text-gray-500 font-medium">{user.email}</span>
                    </span>
                </OptionButton>
            ))}

            <PrimaryButton className="sticky bottom-6" isLoading={isSubmitting}>
                Benutzer hinzufügen
            </PrimaryButton>
        </form>
    );
};

const SharePollPage = () => {
    const { pollId } = useParams();
    const { data: poll } = useQuery(getPollQuery(pollId || ''));
    const { data: users } = useQuery(listUsersQuery());

    const { mutateAsync: createPollUsers } = useMutation(createPollUsersMutation(pollId || ''));

    const navigate = useNavigate();

    const handleFormValuesSubmit = async (values: any) => {
        await createPollUsers(values);
        navigate(generatePath(ROUTES.POLL_MANAGE, { pollId: poll!.id }));
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

    const secretUrl = `${window.location.origin}${generatePath(ROUTES.POLL_DETAIL, { pollId: poll!.id })}?secret=${poll.secret}`;

    const handleCopyToClipboard = async () => {
        navigator.clipboard.writeText(secretUrl);
        const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        await wait(500);
    };

    return (
        <Theme theme="gray" base="gray">
            <Page>
                <Theme theme={poll.colorScheme.toLowerCase() as any}>
                    <div className="bg-theme-100 w-full flex flex-col items-center">
                        <Page.Inner>
                            <PollHeader poll={poll} />
                        </Page.Inner>
                    </div>
                </Theme>

                <Page.Inner>
                    <CreatePollHeader />

                    <div className="px-6">
                        <div className="select-text flex flex-col gap-6 items-center p-6 py-12 rounded-5xl bg-theme-100">
                            <QrCode
                                value={secretUrl}
                                className="w-70 h-70 max-w-full max-h-full p-4 rounded-xl border-4 border-theme-200 bg-white"
                            />

                            <PrimaryButton type="button" onClick={handleCopyToClipboard}>
                                Link kopieren
                            </PrimaryButton>

                            <a
                                className="text-center text-balance text-gray-400 text-sm mt-2 break-all hover:underline hover:text-gray-500"
                                href={secretUrl}
                                target="_blank"
                            >
                                {secretUrl}
                            </a>
                        </div>
                    </div>

                    <div className="p-6">
                        <SecondaryButton type="button" asChild>
                            <Link to={generatePath(ROUTES.POLL_MANAGE, { pollId: poll!.id })}>
                                Abstimmung verwalten
                            </Link>
                        </SecondaryButton>
                    </div>

                    <div className="p-6">
                        <h2 className="text-3xl font-bold  text-black hyphens-auto text-balance flex">
                            Benutzer hinzufügen
                        </h2>
                    </div>

                    <InviteUsersForm
                        poll={poll}
                        users={users!}
                        onFormValuesSubmit={handleFormValuesSubmit}
                        className="pt-0"
                    />
                </Page.Inner>
            </Page>
        </Theme>
    );
};

export default SharePollPage;
