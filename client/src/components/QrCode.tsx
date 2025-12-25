import QRCode from 'qrcode';
import React, { useEffect, useState } from 'react';

const QrCode = ({ value, ...props }: Omit<React.ComponentPropsWithRef<'img'>, 'href'> & { value: string }) => {
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        QRCode.toDataURL(value, { margin: 0, width: 600 })
            .then((url: string) => setQrCodeUrl(url))
            .catch((err: any) => console.error(err));
    }, [value]);

    return <img src={qrCodeUrl} alt="QR Code" {...props} />;
};

export default QrCode;
