import sqlite3
import os

def check_notifications():
    db_path = 'C:\\Users\\PBonde1\\OneDrive - Rockwell Automation, Inc\\Desktop\\Project\\backend\\test.db'
    
    # Check if the database file exists
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Query to fetch all notifications
        cursor.execute("SELECT * FROM kpis")
        notifications = cursor.fetchall()

        # Print notifications
        for notification in notifications:
            print(notification)

    except sqlite3.OperationalError as e:
        print(f"OperationalError: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_notifications()
