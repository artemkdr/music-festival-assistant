import { RiMusicAiFill } from 'react-icons/ri';

export const Logo = ({ size = 32, className = '' }) => {
    return (
        <div className={`bg-gradient-to-br from-purple-600 to-blue-400 rounded-lg p-3 ${className}`}>
            <span className="text-white font-bold text-xl">
                <RiMusicAiFill size={size} />
            </span>
        </div>
    );
};
