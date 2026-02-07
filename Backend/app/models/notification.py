def get_notification_collection(db):
    """Get the notifications collection"""
    return db["notifications"]

def get_user_notifications_collection(db):
    """Get the user_notifications collection"""
    return db["user_notifications"]

# Collection indexes for better performance
async def create_notification_indexes(db):
    """Create indexes for notification collections"""
    try:
        notification_collection = get_notification_collection(db)
        user_notifications_collection = get_user_notifications_collection(db)
        
        # Indexes for notifications collection
        await notification_collection.create_index("created_at")
        await notification_collection.create_index("status")
        await notification_collection.create_index("recipient_type")
        await notification_collection.create_index("type")
        
        # Indexes for user_notifications collection
        await user_notifications_collection.create_index("user_id")
        await user_notifications_collection.create_index("notification_id")
        await user_notifications_collection.create_index("is_read")
        await user_notifications_collection.create_index("created_at")
        await user_notifications_collection.create_index([("user_id", 1), ("created_at", -1)])
        
        print("✅ Notification indexes created successfully")
        
    except Exception as e:
        print(f"❌ Error creating notification indexes: {e}")
