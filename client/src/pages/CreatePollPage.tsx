import Theme from '../components/Theme.tsx';
import React, { useState } from 'react';
import type { Poll } from '../data/types.ts';
import classnames from '../utils/classnames.ts';
import { useMutation } from '@tanstack/react-query';
import { createPollMutation } from '../data/api.ts';
import { PrimaryButton, SecondaryButton } from '../components/Button.tsx';
import { generatePath, Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { ChevronDownIcon } from 'lucide-react';
import Page from '../components/Page.tsx';

const CreatePollHeader = () => {
    return (
        <header className="flex flex-col gap-4 p-6 py-8">
            <div className="flex items-center justify-end -mt-2">
                <SecondaryButton asChild className="p-2 px-4 bg-transparent">
                    <Link to={generatePath(ROUTES.HOME)}>Abbrechen</Link>
                </SecondaryButton>
            </div>

            <h1 className="text-4.5xl/13 font-bold  text-black flex items-center gap-3">Abstimmung erstellen</h1>
        </header>
    );
};

const TitleInput = ({ className, ...props }: React.ComponentPropsWithRef<'textarea'>) => {
    return (
        <textarea
            className="text-3xl/10 font-bold  text-gray-800 hyphens-auto text-balance bg-gray-100 py-4 px-5 rounded-3xl resize-none"
            placeholder="Thema der Abstimmung"
            rows={3}
            {...props}
        />
    );
};

const OptionInput = ({ className, ...props }: React.ComponentPropsWithRef<'textarea'>) => {
    return (
        <textarea
            className="rounded-5xl bg-white text-gray-900 text-2xl font-semibold flex-1 py-4 px-5 text-left flex items-center gap-3 border-4 border-gray-200 group hover:border-gray-300 hover:bg-gray-200 resize-none"
            placeholder="Option 1"
            rows={1}
            {...props}
        />
    );
};

const CHOICE_TYPES = {
    SINGLE: 'Single Choice',
    MULTIPLE: 'Multiple Choice',
};

const COLOR_SCHEMES = {
    RED: 'Rot',
    ORANGE: 'Orange',
    AMBER: 'Amber',
    YELLOW: 'Gelb',
    LIME: 'Lime',
    GREEN: 'Grün',
    TEAL: 'Teal',
    CYAN: 'Cyan',
    SKY: 'Sky',
    BLUE: 'Blau',
    INDIGO: 'Indigo',
    VIOLET: 'Violet',
    PURPLE: 'Lila',
    FUCHSIA: 'Fuchsia',
    PINK: 'Pink',
    ROSE: 'Rose',
    SLATE: 'Slate',
    GRAY: 'Gray',
    ZINC: 'Zinc',
    NEUTRAL: 'Neutral',
    STONE: 'Stone',
};

const Select = ({ className, ...props }: React.ComponentPropsWithRef<'select'>) => {
    return (
        <div className="w-full flex-1 relative">
            <select
                className="flex items-center gap-4 text-2xl font-semibold text-gray-900 border-4 border-gray-200 bg-gray-200 rounded-5xl py-2 px-4 w-full appearance-none pr-10 hover:border-gray-300 hover:bg-gray-300 cursor-pointer"
                {...props}
            >
                {props.children}
            </select>

            <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-gray-500 text-2xl">
                <ChevronDownIcon />
            </div>
        </div>
    );
};

const ChoiceTypeSelect = ({ className, ...props }: React.ComponentPropsWithRef<'select'>) => {
    return (
        <Select {...props}>
            {Object.entries(CHOICE_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                    {label}
                </option>
            ))}
        </Select>
    );
};

const ColorSchemeSelect = ({ className, ...props }: React.ComponentPropsWithRef<'select'>) => {
    return (
        <Select {...props}>
            {Object.entries(COLOR_SCHEMES).map(([value, label]) => (
                <option key={value} value={value}>
                    {label}
                </option>
            ))}
        </Select>
    );
};

const CreatePollForm = ({
    className,
    onFormValuesSubmit,
    ...props
}: React.ComponentPropsWithRef<'form'> & {
    onFormValuesSubmit?: (values: Partial<Poll>) => Promise<void>;
}) => {
    const [title, setTitle] = useState('');
    const [options, setOptions] = useState<string[]>(['', '']);
    const [choiceType, setChoiceType] = useState<keyof typeof CHOICE_TYPES>('SINGLE');
    const [colorScheme, setColorScheme] = useState<keyof typeof COLOR_SCHEMES>('INDIGO');

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleAddOption = () => {
        setOptions([...options, '']);
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const filteredOptions = [...new Set(options.filter((option) => option.trim() !== ''))];

        setIsSubmitting(true);
        try {
            await onFormValuesSubmit?.({
                title,
                options: filteredOptions,
                choiceType,
                colorScheme,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form
            className={classnames('flex flex-col min-h-full w-full p-6 gap-10 bg-white justify-start', className)}
            onSubmit={handleSubmit}
            {...props}
        >
            <TitleInput value={title} onChange={(e) => setTitle(e.target.value)} />

            <div className="flex flex-col flex-wrap gap-6">
                {options.map((option, index) => (
                    <OptionInput
                        key={index}
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                    />
                ))}

                <button
                    className="rounded-5xl  text-gray-900 text-2xl font-semibold flex-1 py-4 px-5 text-left flex items-center gap-3 border-gray-200 group hover:border-gray-300 hover:bg-gray-200 cursor-pointer resize-none"
                    onClick={handleAddOption}
                    type="button"
                >
                    + Option hinzufügen
                </button>
            </div>

            <div className="flex flex-col w-full gap-10 flex-wrap">
                <div className="flex flex-col gap-4 flex-1">
                    <label className="flex items-center gap-4 text-2xl font-semibold text-gray-700">
                        Abstimmungart
                    </label>

                    <div className="flex justify-between items-center">
                        <ChoiceTypeSelect
                            value={choiceType}
                            onChange={(e) => setChoiceType(e.target.value as keyof typeof CHOICE_TYPES)}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-4 flex-1">
                    <label className="flex items-center gap-4 text-2xl font-semibold text-gray-700">Farbschema</label>

                    <div className="flex justify-between items-center">
                        <ColorSchemeSelect
                            value={colorScheme}
                            onChange={(e) => setColorScheme(e.target.value as keyof typeof COLOR_SCHEMES)}
                        />
                    </div>
                </div>
            </div>

            <span className="text-2xl font-medium text-gray-600">
                Abstimmungen werden nach spätestens sieben Tagen automatisch beendet und nach spätestens 30 Tagen
                automatisch gelöscht. Du kannst sie jederzeit manuell beenden oder löschen.
            </span>

            <PrimaryButton isLoading={isSubmitting}>Abstimmung erstellen</PrimaryButton>
        </form>
    );
};

const CreatePollPage = () => {
    const { mutateAsync: createPoll } = useMutation(createPollMutation());

    const navigate = useNavigate();

    const handleFormValuesSubmit = async (values: any) => {
        const poll = await createPoll(values);
        navigate(generatePath(ROUTES.POLL_SHARE, { pollId: poll.id }));
    };

    return (
        <Theme theme="gray" base="gray">
            <Page>
                <Page.Inner>
                    <CreatePollHeader />
                    <CreatePollForm onFormValuesSubmit={handleFormValuesSubmit} />
                </Page.Inner>
            </Page>
        </Theme>
    );
};

export default CreatePollPage;
