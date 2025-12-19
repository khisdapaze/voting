import { MutationCache, QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    mutationCache: new MutationCache({
        onSuccess: (data, variables, context, mutation) => {
            if (!mutation.options?.meta?.skipInvalidateQueries) {
                void queryClient.invalidateQueries();
            }
        },
    }),
});
