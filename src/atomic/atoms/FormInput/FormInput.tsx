import React from 'react'
import styles from './FormInput.module.scss'
import classNames from 'classnames'
import Typography, { FontTypes } from '../Typography/Typography.tsx'

interface ButtonProps {
    label?: string
    name: string
    validator?: (val: string) => boolean
    value?: string | number
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    className?: string
    placeholder?: string
    labelInColumn?: boolean
    labelFont?: FontTypes
}

const FormInput: React.FC<ButtonProps> = ({
    label = '',
    name,
    value,
    onChange,
    className,
    placeholder,
    labelInColumn = false,
    labelFont = 'r20',
}) => {
    return (
        <div
            className={classNames(
                styles.formInput,
                className,
                labelInColumn && styles.columnInput
            )}
        >
            {label && (
                <Typography
                    dType={labelFont}
                    className={styles.formInput__label}
                >
                    {label}
                </Typography>
            )}
            <input
                name={name}
                className={styles.formInput__input}
                value={value}
                placeholder={placeholder}
                onChange={onChange}
            />
        </div>
    )
}

export default FormInput
