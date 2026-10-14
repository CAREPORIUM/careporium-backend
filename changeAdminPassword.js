import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './models/userModel.js';
import dotenv from 'dotenv';

dotenv.config();

const changeAdminPassword = async () => {

    try {

        // connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        // find the existing platform admin
        const admin = await User.findOne({
            email: 'admin@careporium.com',
            role: 'admin'
        });

        if (!admin) {
            throw new Error('Platform admin not found');
        }

        // hash the new admin password
        const hashedPassword = await bcrypt.hash(
            'Careporium@123',
            10
        );

        // update the existing admin password
        admin.password = hashedPassword;

        await admin.save();

        console.log('Admin password updated successfully');

        process.exit(0);

    } catch (error) {

        console.error('Error updating admin password:', error);

        process.exit(1);

    } finally {

        await mongoose.disconnect().catch(() => {});

    }
};

changeAdminPassword();