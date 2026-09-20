export const metadata = {
  title: 'Settings - Task Manager',
  description: 'Manage your Task Manager preferences and settings.',
};

export default function SettingsPage() {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-foreground">Settings</h1>
        
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Profile Settings</h2>
          <p className="text-muted-foreground mb-4">Update your personal information and preferences here.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Name</label>
              <input 
                type="text" 
                className="w-full max-w-md px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" 
                placeholder="Your Name" 
                disabled 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input 
                type="email" 
                className="w-full max-w-md px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" 
                placeholder="your.email@example.com" 
                disabled 
              />
            </div>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">App Preferences</h2>
          <p className="text-muted-foreground">General settings will be added here soon.</p>
        </div>
      </div>
    </div>
  );
}
