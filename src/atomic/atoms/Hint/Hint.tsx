import React from 'react'
import styles from './Hint.module.scss'
import { IHint } from '../../../mockedData/mockedData.ts'
import classNames from 'classnames'

const typeClassMap = {
    1: styles.first,
    2: styles.second,
    3: styles.third,
}

const Hint: React.FC<IHint> = ({ text, type = 1 }) => {
    return (
        <div className={classNames(styles.hint, typeClassMap[type])}>
            {text}
        </div>
    )
}

export default Hint
