// // src/components/CustomRecordingComponent.tsx
// import React, { useEffect } from 'react';
// import {
//   GridLayout,
//   ParticipantTile,
//   ParticipantName,
//   RoomAudioRenderer,
//   useParticipants,
//   useTracks,
//   useRoomContext,
//   ConnectionState,
// } from "@livekit/components-react";
// import { Track } from "livekit-client";
// import { EgressTemplate } from "@livekit/egress-adapter";

// const CustomRecordingComponent = () => {
//   const room = useRoomContext();
//   const participants = useParticipants();
//   const tracks = useTracks(
//     [
//       { source: Track.Source.Camera, withPlaceholder: true },
//       { source: Track.Source.ScreenShare, withPlaceholder: false },
//     ],
//     { onlySubscribed: false }
//   );

//   useEffect(() => {
//     // signal to egress that the template has loaded and is ready
//     window.egressReady();
//   }, []);

//   return (
//     <EgressTemplate>
//       <div className="recording-container">
//         <GridLayout tracks={tracks} style={{ height: "100vh", width: "100vw" }}>
//           <div className="participant-wrapper">
//             <ParticipantTile />
//             <div className="participant-info">
//               <ParticipantName />
//             </div>
//           </div>
//         </GridLayout>
//         <RoomAudioRenderer />
//       </div>
//     </EgressTemplate>
//   );
// };

// export default CustomRecordingComponent;
