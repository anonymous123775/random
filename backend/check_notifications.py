import sqlite3
import os

def check_notifications():
    db_path = 'C:\\Users\\PBonde1\\OneDrive - Rockwell Automation, Inc\\Desktop\\Project\\backend\\test.db'
    # db_path = r'D:\Demo Project\random\backend\test.db'
    
    # Check if the database file exists
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Query to fetch all notifications
        cursor.execute("SELECT * FROM last_fetched_timestamps")
        notifications = cursor.fetchall()

        # Print notifications
        for notification in notifications:
            print(notification)
            
        # cursor.execute("DELETE FROM last_fetched_timestamps")  # This will delete all notifications
        # conn.commit()  # Commit the changes to the database
        # print("All notifications have been cleared.")
        
        # cursor.execute("ALTER TABLE notifications ADD COLUMN severity TEXT")
        # conn.commit()  # Commit the changes to the database
        # print("Column 'severity' added to notifications table.")

    except sqlite3.OperationalError as e:
        print(f"OperationalError: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_notifications()
