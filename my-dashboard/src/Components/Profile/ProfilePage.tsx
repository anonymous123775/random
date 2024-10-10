// ProfilePage.tsx
import React, { useEffect, useState } from 'react';
import { fetchUserData, updateUserData } from '../Services/api'; // Adjust the path according to your structure
import ProfileCard from './ProfileCard';
import ProfileForm from './ProfileForm';
import './ProfilePage.css'; // Import CSS for styling

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      const userData = await fetchUserData(); // Fetch user data from API
      setUser(userData);
    };

    loadUserData();
  }, []);

  const handleUpdateUser = async (updatedUser: any) => {
    await updateUserData(updatedUser); // Update user data in API
    setUser(updatedUser); // Update local state
    setIsEditing(false); // Close edit mode
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="profile-page">
      <ProfileCard user={user} onEdit={() => setIsEditing(true)} />
      {isEditing && <ProfileForm user={user} onUpdate={handleUpdateUser} onCancel={() => setIsEditing(false)} />}
    </div>
  );
};

export default ProfilePage;
