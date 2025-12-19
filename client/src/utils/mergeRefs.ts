const mergeRefs = (...refs: any[]) => {
    return (node: any) => {
        for (const ref of refs) {
            if (ref == null) continue;

            if (typeof ref === 'function') {
                ref(node);
                continue;
            }

            ref.current = node;
        }
    };
};

export default mergeRefs;
