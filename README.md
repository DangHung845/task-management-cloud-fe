# task-management-cloud-fe

Files:
- index.html: markup only
- styles.css: all styles
- script.js: all behavior
- api.js: all API connections 

---

## 1. Build the frontend locally

Before uploading anything to AWS, build the frontend on your computer.

Common output folders are:

* `dist` for Vite
* `build` for Create React App

After building, make sure the output folder contains the final production files that the browser should load.

---

## 2. Create a private S3 bucket

1. Open the **AWS Console** and go to **S3**.
2. Click **Create bucket**.
3. Enter a unique bucket name.
4. Choose the AWS Region.
5. Keep **Block all public access** enabled.
6. Create the bucket.

### Important bucket settings

After the bucket is created, open it and check these settings:

* **Block Public Access**: all four options must stay enabled
* **Object Ownership**: use **Bucket owner enforced** if available
* **Static website hosting**: must stay **disabled**

The bucket must remain private at all times.

---

## 4. Upload the frontend files to S3

1. Open your S3 bucket.
2. Click **Upload**.
3. Add all files from the frontend build folder.
4. Confirm the upload.

Make sure the upload includes the main entry file, `index.html`, along with all CSS, JavaScript, and asset files.

---

## 5. Create an Origin Access Control (OAC)

OAC is required so CloudFront can access the private S3 bucket.

1. Open **CloudFront** in the AWS Console.
2. Go to **Origin access control**.
3. Click **Create control setting**.
4. Set **Origin type** to **S3**.
5. Set the signing behavior to **Sign requests**.
6. Create the OAC.

This OAC will later be attached to the CloudFront distribution.

---

## 6. Create a CloudFront distribution

1. Open **CloudFront**.
2. Click **Create distribution**.
3. For the origin, select your S3 bucket.
4. Under **Origin access**, choose **Origin access control settings (recommended)**.
5. Select the OAC you created.
6. Set **Viewer protocol policy** to **Redirect HTTP to HTTPS**.
7. Set **Default root object** to `index.html`.

After creation, CloudFront will be the only public entry point for the frontend.

---

## 7. Add the S3 bucket policy

The bucket policy must allow only CloudFront to read the files.

1. Open the S3 bucket.
2. Go to the **Permissions** tab.
3. Find **Bucket policy**.
4. Click **Edit**.
5. Paste a policy that:

   * allows the CloudFront service principal
   * allows only `s3:GetObject`
   * restricts access to your specific CloudFront distribution ARN
6. Save the policy.

The bucket should still remain private after this step.

---

## 8. Test the deployment

After CloudFront finishes deploying, test the frontend in two ways.

### 8.1 Direct S3 access

Open the S3 object URL directly in a browser.

Expected result:

* Access must be denied
* You should see **403 Forbidden** or **AccessDenied**

This proves the bucket is private.

### 8.2 CloudFront access

Open the CloudFront domain name shown in the distribution details.

Expected result:

* The frontend loads correctly
* The page returns **200 OK**

This proves CloudFront is serving the frontend successfully.

---


## 9. Common mistakes to avoid

* Making the S3 bucket public
* Enabling S3 static website hosting
* Using the S3 bucket URL directly in the browser
* Forgetting to attach OAC to CloudFront
* Forgetting to update the bucket policy after creating the distribution
* Forgetting to set `index.html` as the default root object

---

## 10. Final result

When the deployment is correct:

* The S3 bucket stays private
* CloudFront serves the frontend
* Direct S3 access is denied
* The frontend loads through the CloudFront domain with HTTPS

---


