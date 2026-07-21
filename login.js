 const supabaseUrl = 'https://idaezmgyjvcetagcdtpl.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYWV6bWd5anZjZXRhZ2NkdHBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTA0MDIsImV4cCI6MjEwMDE4NjQwMn0.IFWACNDgnNoMNJaDut12uWfEIFtMo9pTX7Jdnn8p02k';
       // 1. Apne credentials yahan dalein
        
        // Yahan 'supabaseClient' naam use kiya hai error hatane ke liye
        const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            // Ye line page ko reload hone (ya 404 par jaane) se rokegi
            e.preventDefault(); 
            
            const password = document.getElementById('passwordInput').value;
            const msgBox = document.getElementById('statusMessage');
            const btn = document.getElementById('submitBtn');

            // Loading state
            btn.innerText = 'Verifying...';
            btn.classList.add('opacity-75', 'cursor-not-allowed');
            msgBox.classList.add('hidden');

            try {
                // Yahan 'supabaseClient' use hoga
                const { data, error } = await supabaseClient
                    .from('Users') 
                    .select('*')
                    .eq('password', password); 

                if (error) throw error;

                if (data && data.length > 0) {
                    msgBox.className = 'mt-5 text-sm font-medium text-green-400';
                    msgBox.innerText = '✅ Access Granted!';
                } else {
                    msgBox.className = 'mt-5 text-sm font-medium text-red-400';
                    msgBox.innerText = '❌ Incorrect Passcode';
                }
            } catch (err) {
                console.error("Supabase Error:", err.message);
                msgBox.className = 'mt-5 text-sm font-medium text-red-500';
                msgBox.innerText = '⚠️ Error connecting to database';
            } finally {
                // Reset button state
                btn.innerText = 'Unlock';
                btn.classList.remove('opacity-75', 'cursor-not-allowed');
                msgBox.classList.remove('hidden');
            }
        });
