import React, { MouseEventHandler } from 'react'
import styles from './Switch.module.scss'
import classNames from 'classnames'

interface SwitchProps {
    isActive: boolean
    onClick?: MouseEventHandler<HTMLDivElement>
}
const Switch: React.FC<SwitchProps> = ({ isActive, onClick }) => {
    return (
        <div
            className={classNames(
                styles.eclipse,
                isActive ? styles.active : null
            )}
            onClick={onClick}
        >
            <div
                className={classNames(
                    styles.circle,
                    isActive ? styles.activeCircle : null
                )}
            />
        </div>
    )
}

export default Switch
