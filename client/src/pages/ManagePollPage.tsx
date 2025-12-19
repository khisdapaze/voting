import Theme from '../components/Theme.tsx';
import React from 'react';
import type { User } from '../data/types.ts';
import classnames from '../utils/classnames.ts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { closePollMutation, deletePollMutation, getPollQuery } from '../data/api.ts';
import { PrimaryButton, SecondaryButton } from '../components/Button.tsx';
import { generatePath, Link, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { OptionButton, PollHeader } from './PollDetailPage.tsx';
import { useConfirmDialog } from '../components/ConfirmDialog.tsx';

const ManagePollHeader = () => {
    return (
        <header className="flex flex-col gap-4 p-6 py-8">
            <h1 className="text-4.5xl/13 font-bold  text-black flex items-center gap-3">Abstimmung verwalten</h1>
        </header>
    );
};

const UserList = ({
    className,
    users,
    ...props
}: React.ComponentPropsWithRef<'div'> & {
    users: User[];
}) => {
    return (
        <div
            className={classnames('flex flex-col min-h-full w-full gap-4 bg-white justify-start', className)}
            {...props}
        >
            {users?.map((user) => (
                <OptionButton key={user.name} isMultipleChoice className="w-full" isReadOnly>
                    {user.name}
                </OptionButton>
            ))}
            {users && users.length === 0 && (
                <div className="flex items-center justify-center h-32 w-full text-gray-500 text-2xl font-medium">
                    Keine Benutzer gefunden.
                </div>
            )}
        </div>
    );
};

const ManagePollPage = () => {
    const { pollId } = useParams();
    const { data: poll } = useQuery(getPollQuery(pollId || ''));

    const { mutateAsync: closePoll } = useMutation(closePollMutation(pollId || ''));
    const { mutateAsync: deletePoll } = useMutation(deletePollMutation(pollId || ''));

    const navigate = useNavigate();

    const { confirm: confirmSubmit, ConfirmDialog: ConfirmSubmitDialog } = useConfirmDialog();
    const { confirm: confirmDelete, ConfirmDialog: ConfirmDeleteDialog } = useConfirmDialog();

    const handleCloseClick = async (values: any) => {
        const confirmed = await confirmSubmit();
        if (!confirmed) return;

        await closePoll();
        navigate(generatePath(ROUTES.POLL_DETAIL, { pollId: poll!.id }));
    };

    const handleDeleteClick = async (values: any) => {
        const confirmed = await confirmDelete();
        if (!confirmed) return;

        await deletePoll();
        navigate(ROUTES.HOME);
    };

    if (!poll) {
        return (
            <div className="flex items-center justify-center h-full w-full text-gray-500 text-2xl font-medium py-12">
                Lade Abstimmung...
            </div>
        );
    }

    const pollUsersVoted = (poll?.users || []).filter((user) => user.status === 'VOTED');
    const pollUsersEligible = (poll?.users || []).filter((user) => user.status === 'ELIGIBLE');

    const isPollClosed = poll.status === 'CLOSED';

    return (
        <Theme theme="gray" base="gray">
            <div className="flex flex-col min-h-full">
                <Theme theme={poll.colorScheme.toLowerCase() as any}>
                    <PollHeader poll={poll} />
                </Theme>

                <ManagePollHeader />

                <div className="flex flex-col gap-10 pt-0">
                    <div className="flex flex-col gap-6 p-6 pt-0">
                        {isPollClosed && (
                            <span className="text-2xl font-medium text-gray-600">
                                Diese Abstimmung ist beendet. Es können keine weiteren Stimmen abgegeben werden.
                            </span>
                        )}

                        <SecondaryButton asChild disabled={isPollClosed}>
                            <Link to={generatePath(ROUTES.POLL_SHARE, { pollId: poll!.id })}>Abstimmung teilen</Link>
                        </SecondaryButton>

                        <PrimaryButton type="button" onClick={handleCloseClick} disabled={isPollClosed}>
                            Abstimmung beenden
                        </PrimaryButton>

                        <PrimaryButton
                            type="button"
                            onClick={handleDeleteClick}
                            className="bg-red-600 hover:bg-red-700 active:bg-red-800"
                        >
                            Abstimmung löschen
                        </PrimaryButton>
                    </div>

                    {pollUsersVoted.length > 0 && (
                        <div className="p-6 pt-0 flex flex-col gap-6">
                            <h2 className="text-3xl font-bold  text-black hyphens-auto text-balance flex">
                                Abgestimmt
                            </h2>
                            <UserList users={pollUsersVoted} />
                        </div>
                    )}

                    {pollUsersEligible.length > 0 && (
                        <div className="p-6 pt-0 flex flex-col gap-6">
                            <h2 className="text-3xl font-bold  text-black hyphens-auto text-balance flex">Offen</h2>
                            <UserList users={pollUsersEligible} />
                        </div>
                    )}
                </div>

                <ConfirmSubmitDialog
                    title="Abstimmung beenden"
                    message={
                        <span className="flex flex-col gap-8 my-4">
                            <span className="text-gray-600 text-2xl/8 font-medium">
                                Bist du sicher, dass du die Abstimmung beenden möchtest? Diese Aktion kann nicht
                                rückgängig gemacht werden.
                            </span>
                            <span className="text-gray-600 text-2xl/8 font-medium">
                                Nach dem Beenden der Abstimmung können keine weiteren Stimmen mehr abgegeben werden und
                                die Ergebnisse werden für alle Teilnehmer sichtbar.
                            </span>
                        </span>
                    }
                    submitLabel="Abstimmung beenden"
                    cancelLabel="Abbrechen"
                />

                <ConfirmDeleteDialog
                    title="Abstimmung löschen"
                    message={
                        <span className="flex flex-col gap-8 my-4">
                            <span className="text-gray-600 text-2xl/8 font-medium">
                                Bist du sicher, dass du die Abstimmung löschen möchtest? Diese Aktion kann nicht
                                rückgängig gemacht werden.
                            </span>
                            <span className="text-gray-600 text-2xl/8 font-medium">
                                Nach dem Löschen der Abstimmung werden alle zugehörigen Daten dauerhaft entfernt und
                                können nicht wiederhergestellt werden.
                            </span>
                        </span>
                    }
                    submitLabel="Abstimmung löschen"
                    cancelLabel="Abbrechen"
                    danger
                />
            </div>
        </Theme>
    );
};

export default ManagePollPage;
