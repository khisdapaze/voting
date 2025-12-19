export interface User {
    name: string;
    email: string;
    imageUrl?: string;
}

export interface Token {
    pollId: string;
    status: 'GRANTED' | 'USED';
}

export interface Vote {
    pollId: string;
    value: string;
}

export interface PollUser extends User {
    status: 'ELIGIBLE' | 'VOTED';
}

export interface Poll {
    id: string;
    createdAt: string;
    createdByEmail?: string;

    title: string;
    options: string[];
    choiceType: 'SINGLE' | 'MULTIPLE';
    accessType: 'PUBLIC' | 'LINK_ONLY' | 'INVITE_ONLY';
    colorScheme:
        | 'RED'
        | 'ORANGE'
        | 'AMBER'
        | 'YELLOW'
        | 'LIME'
        | 'GREEN'
        | 'TEAL'
        | 'CYAN'
        | 'SKY'
        | 'BLUE'
        | 'INDIGO'
        | 'VIOLET'
        | 'PURPLE'
        | 'FUCHSIA'
        | 'PINK'
        | 'ROSE'
        | 'SLATE'
        | 'GRAY'
        | 'ZINC'
        | 'NEUTRAL'
        | 'STONE';

    status: 'DRAFT' | 'OPEN' | 'CLOSED';

    // virtual
    createdBy?: User;
    users?: PollUser[];
    results?: Record<string, number>;
}
