export const ROUTES = {
    HOME: '/',
    POLL_CREATE: '/poll/create',
    POLL_DETAIL: `/poll/:pollId`,
    POLL_SHARE: `/poll/:pollId/share`,
    POLL_MANAGE: `/poll/:pollId/manage`,
} as const;
