import React from 'react'
import styles from './Typography.module.scss'
import classNames from 'classnames'

export type FontTypes = 'r48' | 'r32' | 'r24' | 'r20' | 'r16' | 'r14' | 'r12'

interface TypographyProps {
    children?: React.ReactNode
    className?: string
    dType?: FontTypes
    mType?: ''
    fontSize?: string
    lineHeight?: string
    color?: string
    href?: string
}

const Typography: React.FC<TypographyProps> = ({
    children,
    className = '',
    dType = 'r24',
    color,
    lineHeight,
    fontSize,
    href,
}) => {
    return (
        <>
            {href ? (
                <a
                    href={href}
                    className={classNames(className, styles[dType])}
                    style={{
                        color: color,
                        lineHeight: lineHeight,
                        fontSize: fontSize,
                    }}
                >
                    {children}
                </a>
            ) : (
                <span
                    className={classNames(className, styles[dType])}
                    style={{
                        color: color,
                        lineHeight: lineHeight,
                        fontSize: fontSize,
                    }}
                >
                    {children}
                </span>
            )}
        </>
    )
}

export default Typography
