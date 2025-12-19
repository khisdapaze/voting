import { GoogleLogin } from '@react-oauth/google';

const AuthenticationPage = ({
    onAuthenticationSuccess,
    onAuthenticationError,
}: {
    onAuthenticationSuccess?: (jwt: string) => void;
    onAuthenticationError?: () => void;
}) => {
    return (
        <div className="flex flex-col min-h-full w-full p-7 gap-20 bg-white items-center justify-center">
            <h1 className="text-6xl/16 font-bold  text-black hyphens-auto text-balance text-center">
                Hallo,
                <br /> <span className="text-gray-700">wer bist du?</span>
            </h1>
            <div className="pb-20 scale-140">
                <GoogleLogin
                    onSuccess={(credentialResponse) => onAuthenticationSuccess?.(credentialResponse.credential!)}
                    onError={onAuthenticationError}
                    size="large"
                />
            </div>
        </div>
    );
};

export default AuthenticationPage;
