import React from 'react'
import styles from './Select.module.scss'

interface SelectProps {
    options: string[]
    value?: string
    onChange?: (value: string) => void
}

const Select: React.FC<SelectProps> = ({ options, value, onChange }) => {
    return (
        <select
            className={styles.select}
            value={value ?? options[0]}
            onChange={(e) => onChange?.(e.target.value)}
        >
            {options.map((option, index) => (
                <option key={index} value={option}>
                    {option}
                </option>
            ))}
        </select>
    )
}

export default Select
