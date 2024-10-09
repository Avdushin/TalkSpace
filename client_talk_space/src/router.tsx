import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import VoiceChannel from './components/VoiceChannel';
import { isAuthenticated } from './auth';

const Router: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                    path="/channel"
                    element={
                        isAuthenticated() ? <VoiceChannel /> : <Navigate to="/login" />
                    }
                />
                <Route path="/" element={<Navigate to={isAuthenticated() ? "/channel" : "/login"} />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
};

export default Router;
