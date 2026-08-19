import cv2
import os

video_path = "Camera_approaches_JANTSA_wheel_202608180823.mp4"
output_dir = "public/frames"

cap = cv2.VideoCapture(video_path)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
print(f"Total frames: {total_frames}")

# clear old frames
for f in os.listdir(output_dir):
    if f.endswith(".jpg"):
        os.remove(os.path.join(output_dir, f))

# we will extract ALL frames to make it super smooth!
count = 1
while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    out_name = f"ezgif-frame-{str(count).zfill(3)}.jpg"
    out_path = os.path.join(output_dir, out_name)
    # Save as high quality JPG
    cv2.imwrite(out_path, frame, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    count += 1

print(f"Extracted {count-1} frames.")
cap.release()
