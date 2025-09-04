// import { LiveKitRoom } from "@livekit/components-react";
// import CustomRecordingComponent from "../components/CustomRecordingComponent";

// export const CustomLayoutPage = () => {
//   // Extract parameters that LiveKit egress automatically provides
//   const urlParams = new URLSearchParams(window.location.search);
  
//   // LiveKit egress passes these parameters automatically
//   const token = urlParams.get('token');
//   const serverUrl = urlParams.get('url'); 
//   const roomName = urlParams.get('room');
//   const layout = urlParams.get('layout');

//   // For development testing when egress doesn't provide parameters
//   const devToken = 'devkey'; // Only for local testing
//   const devServerUrl = 'ws://localhost:7880'; // Match your egress service
//   const devRoom = 'test-room';

//   // Use egress parameters if available, otherwise fallback to dev values
//   const finalToken = token || devToken;
//   const finalServerUrl = serverUrl || devServerUrl;
//   const finalRoom = roomName || devRoom;

//   console.log('CustomLayoutPage params:', {
//     token: finalToken ? 'present' : 'missing',
//     serverUrl: finalServerUrl,
//     room: finalRoom,
//     layout
//   });

//   if (!finalToken) {
//     return (
//       <div style={{ padding: '20px', textAlign: 'center' }}>
//         <h3>Waiting for connection parameters...</h3>
//         <p>Token: {token ? '✅' : '❌'}</p>
//         <p>Server URL: {serverUrl || 'Not provided'}</p>
//         <p>Room: {roomName || 'Not provided'}</p>
//       </div>
//     );
//   }

//   return (
//     <LiveKitRoom
//       token={finalToken}
//       serverUrl={finalServerUrl}
//       connect={true}
//       options={{
//         adaptiveStream: false,
//         dynacast: false,
//         publishDefaults: {
//           simulcast: false,
//         }
//       }}
//     >
//       <CustomRecordingComponent />
//     </LiveKitRoom>
//   );
// };
