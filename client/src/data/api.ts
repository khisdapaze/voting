import type { Poll, User } from './types.ts';
import { getJwt } from '../contexts/AuthenticationContext.tsx';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const call = async (path: string, method: RequestInit['method'] = 'GET', options?: Omit<RequestInit, 'method'>) => {
    const url = `${BASE_URL}/${path.replace(/^\/+/, '')}`;
    const headers = new Headers(options?.headers);
    headers.set('Authorization', `Bearer ${getJwt()}`);
    headers.set('Content-Type', 'application/json');
    const response = await fetch(url, { method, ...options, headers, credentials: 'include' });
    if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
};

const snakeCase = (str: string) => str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const camelCase = (str: string) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const convertKeys = (obj: any, converter: (str: string) => string): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => convertKeys(item, converter));
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [converter(key), convertKeys(value, converter)])
    );
};

const toSnakeCase = (obj: any) => convertKeys(obj, snakeCase);
const toCamelCase = (obj: any) => convertKeys(obj, camelCase);

/* API CALLS */

const listUsers = async (): Promise<User[]> => {
    return toCamelCase(await call('/users'));
};

const listPolls = async (): Promise<Poll[]> => {
    return toCamelCase(await call('/polls'));
};

const createPoll = async (data: Poll): Promise<Poll> => {
    return toCamelCase(
        await call('/polls', 'POST', {
            body: JSON.stringify(toSnakeCase(data)),
        })
    );
};

const deletePoll = async (pollId: string): Promise<void> => {
    await call(`/polls/${pollId}`, 'DELETE');
};

const getPoll = async (pollId: string): Promise<Poll> => {
    return toCamelCase(await call(`/polls/${pollId}`));
};

const createPollUsers = async (pollId: string, users: Partial<User>[]): Promise<Poll> => {
    return toCamelCase(
        await call(`/polls/${pollId}/users`, 'POST', {
            body: JSON.stringify(toSnakeCase({ users })),
        })
    );
};

const closePoll = async (pollId: string): Promise<Poll> => {
    return toCamelCase(await call(`/polls/${pollId}/close`, 'POST'));
};

const voteInPoll = async (pollId: string, values: string[]): Promise<Poll> => {
    return toCamelCase(
        await call(`/polls/${pollId}/vote`, 'POST', {
            body: JSON.stringify(toSnakeCase({ values })),
        })
    );
};

/* REACT QUERY QUERIES & MUTATIONS */

export const listUsersQuery = () => ({ queryKey: ['listUsers'], queryFn: listUsers });

export const listPollsQuery = () => ({ queryKey: ['listPolls'], queryFn: listPolls });

export const createPollMutation = () => ({ mutationKey: ['createPoll'], mutationFn: createPoll });

export const deletePollMutation = (pollId: string) => ({
    mutationKey: ['deletePoll', pollId],
    mutationFn: () => deletePoll(pollId),
});

export const getPollQuery = (pollId: string) => ({ queryKey: ['getPoll', pollId], queryFn: () => getPoll(pollId) });

export const createPollUsersMutation = (pollId: string) => ({
    mutationKey: ['createPollUsers', pollId],
    mutationFn: ({ users }: { users: Partial<User>[] }) => createPollUsers(pollId, users),
});

export const closePollMutation = (pollId: string) => ({
    mutationKey: ['closePoll', pollId],
    mutationFn: () => closePoll(pollId),
});

export const voteInPollMutation = (pollId: string) => ({
    mutationKey: ['voteInPoll', pollId],
    mutationFn: ({ values }: { values: string[] }) => voteInPoll(pollId, values),
});
