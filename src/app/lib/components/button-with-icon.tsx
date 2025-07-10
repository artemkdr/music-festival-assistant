import React from 'react';

interface ButtonWithIconProps extends React.HTMLAttributes<HTMLButtonElement> {
    label: string;
    icon: React.ReactNode;
}

export const ButtonWithIcon = (props: ButtonWithIconProps) => {
    const { label, icon, className, ...rest } = props;
    return (
        <button className={`${className} flex items-center gap-2`} {...rest}>
            {icon}
            <span className="text-left">{label}</span>
        </button>
    );
};
