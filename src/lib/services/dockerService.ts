import Docker from 'dockerode'

const docker = new Docker()

export async function createContainer(image: string = 'node:16-alpine') {
  try {
    // Pull the image if not exists
    await docker.pull(image)

    // Create container
    const container = await docker.createContainer({
      Image: image,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      WorkingDir: '/app',
      Volumes: {
        '/app': {}
      },
      HostConfig: {
        AutoRemove: true,
        Binds: [`${process.cwd()}/tmp:/app`]
      }
    })

    await container.start()
    return container.id
  } catch (error) {
    console.error('Error creating container:', error)
    throw error
  }
}

export async function removeContainer(containerId: string) {
  try {
    const container = docker.getContainer(containerId)
    await container.stop()
    await container.remove()
  } catch (error) {
    console.error('Error removing container:', error)
  }
}
