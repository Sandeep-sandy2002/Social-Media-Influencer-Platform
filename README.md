# Social Media Influencer Platform
social media influencer platform is a web-based platform that helps users discover influencers, explore brand campaigns, and interact with creator profiles. It allows users to follow influencers, view campaign details, and manage their own profiles through a simple and user-friendly interface.
This project was built to understand full-stack development concepts, including user authentication, data handling, frontend UI design, and backend operations.

⭐ Features


👤 User Accounts
Secure login and registration
Session handling with automatic logout after inactivity
Personalized access to follow influencers and manage data

📢 Influencer Profiles
View influencer details (name, niche, followers, bio, pricing, social links)
Follow / Unfollow influencers
Add, edit, or delete influencer profiles (for creators/admin)

🎯 Brand Campaigns
View available campaigns with budget, niche, and description
Add, edit, or delete campaigns (for creators/admin)
Quick access to campaign external links

🔍 Search System
Search influencers and campaigns in real time
Filters results based on name, niche, or description

💾 Database & Backend Features
Stores all users, influencers, followers, and campaigns
Organized and clean backend structure
Follower count updates instantly
Ownership and permission checks for safety

🛠️ Tech Stack
Frontend
HTML
CSS
JavaScript (Dynamic state-based rendering)

Backend
Node.js
Express.js
REST API structure

Database
MySQL

📁 Project Structure

/frontend
  ├── index.html
  ├── style.css
  ├── pro.js

/backend
  ├── server.js
  ├── db.js
  ├── routes/
      ├── auth.js
      ├── influencers.js
      ├── campaigns.js

🚀 How to Run the Project

1. Clone the Repo
git clone <your-repo-link>
cd connectus
2. Install Backend Dependencies
cd backend
npm install
3. Start the Server
node server.js
4. Open the Frontend
Open the index.html file in your browser.

🧪 Database Setup

Create a MySQL database named:
connectus_db
Create the required tables:
users
influencers
campaigns
followers

🎯 Purpose of the Project
This project helped me understand:
1)How full-stack applications work
2)How to connect frontend pages with backend APIs
3)How to handle users, permissions, and data
4)How to build a user-friendly and functional interface
