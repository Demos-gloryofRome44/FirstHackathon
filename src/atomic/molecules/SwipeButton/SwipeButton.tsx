import React, { useEffect, useRef, useState } from 'react'
import { animate, useMotionValue, motion } from 'framer-motion'
import styles from './SwipeButton.module.scss'
import classNames from 'classnames'
import PhoneSvg from '/src/assets/svg/phone.svg?react'
export interface SwipeToHangupProps {
    /** Width of the whole control in px (default 280) */
    width?: number
    /** Callback fired once the red handle reaches the end */
    onComplete: () => void
    /** Text shown in the track */
    label?: string
    className?: string
}

const SwipeButton: React.FC<SwipeToHangupProps> = ({
    width = 280,
    onComplete,
    label = 'Сбросить звонок',
    className = '',
}) => {
    const trackRef = useRef<HTMLDivElement>(null)
    const handleWidth = 60 // px
    const [maxX, setMaxX] = useState(0)
    const x = useMotionValue(0)

    useEffect(() => {
        if (trackRef.current) {
            setMaxX(trackRef.current.offsetWidth - handleWidth)
        }
    }, [width])

    const onDragEnd = () => {
        if (x.get() > maxX - 10) {
            animate(x, maxX, { type: 'spring', stiffness: 300, damping: 30 })
            onComplete()
        } else {
            animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 })
        }
    }

    return (
        <div
            ref={trackRef}
            className={classNames(styles.wrapper, className)}
            style={{ width, height: handleWidth }}
        >
            <span className={styles.wrapper__label}>{label}</span>

            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: maxX }}
                style={{ x }}
                onDragEnd={onDragEnd}
                className={styles.wrapper__handle}
                whileTap={{ scale: 0.95 }}
            >
                <div className={styles.wrapper__icon}>
                    <PhoneSvg height="25px" width="38px" />
                </div>
            </motion.div>
        </div>
    )
}

export default SwipeButton
