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
    onFormValuesSubmit?: (values: { users: User[] }) => void;
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        onFormValuesSubmit?.({
            users: selectedUsers.map((email) => otherUsers.find((u) => u.email === email)).filter(Boolean) as User[],
        });
    };

    return (
        <form
            className={classnames('flex flex-col min-h-full w-full p-6 gap-4 bg-white justify-start', className)}
            onSubmit={handleSubmit}
            {...props}
        >
            <SecondaryButton className="justify-start" type="button" onClick={handleSelectAllUsers}>
                Alle Mitglieder auswählen
            </SecondaryButton>

            {/*<button className="rounded-5xl bg-gray-100 text-gray-800 text-xl font-semibold py-4 px-6 text-center  hover:bg-gray-200 cursor-pointer active:bg-gray-300 flex items-center gap-4  justify-start">*/}
            {/*    Aktive Mitglieder auswählen*/}
            {/*</button>*/}

            {/*<button className="rounded-5xl bg-gray-100 text-gray-800 text-xl font-semibold py-4 px-6 text-center  hover:bg-gray-200 cursor-pointer active:bg-gray-300 flex items-center gap-4 justify-start">*/}
            {/*    Passive Mitglieder auswählen <span className="ml-auto text-gray-500">18</span>*/}
            {/*</button>*/}

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
                    {user.name}
                </OptionButton>
            ))}

            <PrimaryButton className="sticky bottom-6">Mitglieder hinzufügen</PrimaryButton>
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
            <div className="flex items-center justify-center h-full w-full text-gray-500 text-2xl font-medium py-12">
                Lade Abstimmung...
            </div>
        );
    }

    return (
        <Theme theme="gray" base="gray">
            <div className="flex flex-col min-h-full">
                <Theme theme={poll.colorScheme.toLowerCase() as any}>
                    <PollHeader poll={poll} />
                </Theme>

                <CreatePollHeader />

                <InviteUsersForm
                    poll={poll}
                    users={users!}
                    onFormValuesSubmit={handleFormValuesSubmit}
                    className="pt-0"
                />

                <div className="p-6">
                    <SecondaryButton type="button" asChild>
                        <Link to={generatePath(ROUTES.POLL_MANAGE, { pollId: poll!.id })}>Abstimmung verwalten</Link>
                    </SecondaryButton>
                </div>
            </div>
        </Theme>
    );
};

export default SharePollPage;
