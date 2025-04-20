import styles from './UserPage.module.scss';
import SwipeButton from '../../molecules/SwipeButton/SwipeButton.tsx';
import { useNavigate } from 'react-router-dom';
import RippleAvatar from '../../molecules/RippleAvatar/RippleAvatar.tsx';
import { useWebSocketAudio } from '../useWebSocketAudio';

const UserPage = () => {
    const navigate = useNavigate();
    const { callStatus, endCall } = useWebSocketAudio('ws://localhost:8000/ws/client', 'client');

    const handleSwipe = () => {
        endCall();
        navigate('/');
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.content}>
                <RippleAvatar isActive={callStatus === 'connected'} />
                <div className={styles.status}>
                    {callStatus === 'waiting' && 'Ожидание оператора...'}
                    {callStatus === 'connected' && 'Соединение установлено'}
                </div>
            </div>
            <SwipeButton onComplete={handleSwipe} className={styles.btn} />
        </div>
    );
};

export default UserPage;