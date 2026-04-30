import React from "react";

export default function SimpleTest() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-green-600 mb-6">
          ✅ Simple Test Page Works!
        </h1>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <p className="text-lg text-green-800">
            If you can see this green page with the sidebar, then routing works correctly.
          </p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Browser Information:</h2>
          <p><strong>User Agent:</strong> {navigator.userAgent}</p>
          <p><strong>Online Status:</strong> {navigator.onLine ? "Online" : "Offline"}</p>
          <p><strong>Current URL:</strong> {window.location.href}</p>
        </div>
      </div>
    </div>
  );
}