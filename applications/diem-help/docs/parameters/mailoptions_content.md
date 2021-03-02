<!-- markdownlint-disable MD033 -->
# Parameters for Mail (Job Execution and Content Data) -mail

> Use these features to manage mail sending of text and data via the parameters tab

Mail options for content are completely driven by the job params

They can be used in combination with the job mail options, both are seperate items.

Content mail options are completely driven by the parameters

## Mail Options for Custom Jobs

In Mail Options for Custom Code, you have complete control. You can either provide everything in the code itself, or you can use a combination of custom code with parameters. The latter could be usefull for running the same job in different environemnts

### Specify your own sendgrid api

You can bring in your own Sendgrid Api key. To enable this do the following:

- create a configmap that contains your api_key. Make it private or not
- use that selector name of the configmap as a reference to the api_key

```yaml
mail:
    api_key: configmap # optional link to a configmap that contains your own mail api_key
```

### Code Driven Mail Options

At a minumum add the mail boolean so that the code can import the needed libraries. If you have other mail params this options is not needed. It's only required in case you don't use any other parameter.

```yaml
mail: true
```

alternative you can import the libraries yourself

```py
import diemlib.config as config
from diemlib.mailhandler import mailhandler
```

Create a mailhanler objecty

```py
mh = mailhandler()
```

Sent Your mail (Python example)

```py
mail_subject = f"Daily passord reminders"
mail_content = f"""
  <div style="padding: 15px;margin:15px;border: 1px solid
  #c8d2d2;background:#dfe9e9;border-radius: 10px;">
  Environemnt: :environment</br></br>
  {summary}</br>
  </div>
  """

mh.mail(
  sender = ("cloudsup@us.ibm.com",'Cloud Support'),
  to = [('guy_huinen@be.ibm.com','Guy Huinen'),('guy_huinen@hotmail.com','Guy Huinen')],
  subject = mail_subject,
  content = mail_content
)
```

Specify for sender:

- either a string -> cloudsup@us.ibm.com <cloudsup@us.ibm.com>
- array of strings
- a tuple (email,name) -> 'Cloud Support <cloudsup@us.ibm.com>'
- array of tupples

### Parameter Variables

In case you want to run the same code in various environments you can pass the variables via 3 ways

- Add them as a config map
- Add then to the mail Params
- Add then as plain values

```yaml
configmaps:
  - mailoptions
slack:
  disabled: true
mail:
  api_key: sysadmin_sendgrid
  subject: Your Subject from Mail params
  content: "<div style='padding: 15px;margin:15px;border: 1px solid
    #c8d2d2;background:#dfe9e9;border-radius: 10px;'>Content from Mail
    Params</div>"
  sender: ("cloudsup@us.ibm.com",'Cloud Support')
  to:
    - ('guy_huinen@be.ibm.com','Guy Huinen')
    - ('guy_huinen@hotmail.com','Guy Huinen')
values:
  environment: local
  subject: Your Subject from Values
  content: "<div style='padding: 15px;margin:15px;border: 1px solid
    #c8d2d2;background:#dfe9e9;border-radius: 10px;'>Content from Values</div>"
```

Use them in your code

```py
# for values use them as
subject = ':subject'

# For config maps use them as
subject = mailoptions["subject"]
content = mailoptios["content"]

# for mail params, the variables are created for you
mail_subject
mail_content
```

### Attachments in Code Driven Mail Options

Use this in case your attachment is already saved to disk

```py
mh.mail(
  sender = "guy_huinen@be.ibm.com",
  to = "guy_huinen@hotmail.com",
  subject = mail_subject,
  content = mail_content,
  attachments = 'test.csv',
)
```

Example of streaming download and sending of mail

```py
# load the file
fn = 'org.csv'

# data buffer object
data = cos.loadFile(fn).getbuffer()

mh.mail(
  sender = "guy_huinen@be.ibm.com",
  to = "guy_huinen@hotmail.com",
  subject = mail_subject,
  content = mail_content,
  attachments = (fn,data)
)
```

Example of multiple attachments

```py
fn = 'org.csv'

# load the file into buffer
data = cos.loadFile(fn).getbuffer()

fn2 = 'org2.csv'

# make a copy of the data and save it to disk
f = open(fn2, "wb")
f.write(data)
f.close()

mh.mail(
  sender = "guy_huinen@be.ibm.com",
  to = "guy_huinen@hotmail.com",
  subject = mail_subject,
  content = mail_content,
  attachments = [(fn,data),fn2)
)
```

## Mail Options for Statements (Select)

In Mail Options for statements you don't have control of the code, so this can only be driven by parameters

Mail statements follow the same procedure as the custom jobs. You can specify your subject and content, the sender and to the receivers(t0)

But you need to specify a filename

```yml
mail:
  subject: Your access Manager report
  content: '<div style="padding: 15px;margin:15px;border: 1px solid
    #c8d2d2;background:#dfe9e9;border-radius: 10px;"> Please find enclosed your
    list of access users</div>'
  sender: ("cloudsup@us.ibm.com",'Cloud Support')
  filename: text.xlsx
  to:
    - ('guy_huinen@be.ibm.com','Guy Huinen')
    - ('guy_huinen@hotmail.com','Guy Huinen')
```

In case of no subject the name of the job will be used
In case of no "to" the email of the person who runs the job will be used

You can inline and parse all local variables in your mail

in addition the statement provides a "results_html" that contains the html content of your job

```yml
mail:
  to: guyhuinen@gmail.com
  content: '<div style="padding: 15px;margin:15px;border: 1px solid
    #c8d2d2;background:#dfe9e9;border-radius: 10px;">{results_html}</div>'
  filename: access-mail-test.csv
```
