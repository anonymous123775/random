// ProfileCard.tsx
import React from 'react';

interface ProfileCardProps {
  user: any;
  onEdit: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ user, onEdit }) => {
  return (
    <div className="profile-card">
      <h2>{user.fullName}</h2>
      {/* <img src={user.profilePicture} alt={`${user.fullName}'s profile`} /> */}
      <p>Email: {user.email}</p>
      <p>Username: {user.username}</p>
      <button onClick={onEdit}>Edit Profile</button>
    </div>
  );
};

export default ProfileCard;
